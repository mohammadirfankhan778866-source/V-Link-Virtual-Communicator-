import { RTCPeerConnection, RTCSessionDescription, RTCIceCandidate, mediaDevices } from 'react-native-webrtc';
import { collection, doc, setDoc, getDoc, onSnapshot, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const configuration = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
    },
  ],
};

export class WebRTCService {
  constructor(callerId, receiverId) {
    this.callerId = callerId;
    this.receiverId = receiverId;
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.callId = [callerId, receiverId].sort().join('_'); // Unique ID for call
    this.callDoc = doc(collection(db, 'calls'), this.callId);
    this.onRemoteStream = null;
    this.onCallStatusChange = null;
    this.unsub = null;
  }

  async initialize() {
    this.pc = new RTCPeerConnection(configuration);

    this.localStream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });

    this.localStream.getTracks().forEach(track => {
      this.pc.addTrack(track, this.localStream);
    });

    this.pc.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };
  }

  async startCall() {
    await this.initialize();

    this.pc.onicecandidate = async (event) => {
      if (event.candidate) {
        // Collect ICE candidates and save them (omitted for brevity, typically saved in subcollection)
        const callerCandidates = collection(this.callDoc, 'callerCandidates');
        await setDoc(doc(callerCandidates), event.candidate.toJSON());
      }
    };

    const offerDescription = await this.pc.createOffer();
    await this.pc.setLocalDescription(offerDescription);

    const callWithOffer = {
      callerVirtualId: this.callerId,
      receiverVirtualId: this.receiverId,
      offer: {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      },
      status: 'OFFERING',
    };

    await setDoc(this.callDoc, callWithOffer);

    this.unsub = onSnapshot(this.callDoc, (snapshot) => {
      const data = snapshot.data();
      if (!this.pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        this.pc.setRemoteDescription(answerDescription);
      }
      if (data?.status === 'REJECTED' || data?.status === 'ENDED') {
        this.endCall();
      }
      if (this.onCallStatusChange) {
         this.onCallStatusChange(data?.status);
      }
    });

    // Listen for remote ICE candidates
    const receiverCandidates = collection(this.callDoc, 'receiverCandidates');
    onSnapshot(receiverCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.pc.addIceCandidate(candidate);
        }
      });
    });
  }

  async answerCall(incomingCallId) {
    this.callId = incomingCallId;
    this.callDoc = doc(collection(db, 'calls'), this.callId);
    
    await this.initialize();

    this.pc.onicecandidate = async (event) => {
      if (event.candidate) {
        const receiverCandidates = collection(this.callDoc, 'receiverCandidates');
        await setDoc(doc(receiverCandidates), event.candidate.toJSON());
      }
    };

    const callData = (await getDoc(this.callDoc)).data();
    const offerDescription = callData.offer;
    await this.pc.setRemoteDescription(new RTCSessionDescription(offerDescription));

    const answerDescription = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(this.callDoc, { answer, status: 'ANSWERED' });

    // Listen for remote ICE candidates
    const callerCandidates = collection(this.callDoc, 'callerCandidates');
    onSnapshot(callerCandidates, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          this.pc.addIceCandidate(candidate);
        }
      });
    });

    this.unsub = onSnapshot(this.callDoc, (snapshot) => {
      const data = snapshot.data();
      if (data?.status === 'ENDED') {
        this.endCall();
      }
      if (this.onCallStatusChange) {
         this.onCallStatusChange(data?.status);
      }
    });
  }

  async rejectCall(incomingCallId) {
    const callRef = doc(db, 'calls', incomingCallId);
    await updateDoc(callRef, { status: 'REJECTED' });
  }

  async endCall() {
    if (this.callDoc) {
      await updateDoc(this.callDoc, { status: 'ENDED' });
    }
    
    if (this.unsub) {
        this.unsub();
    }
    
    if (this.pc) {
        this.pc.close();
    }
    if (this.localStream) {
        this.localStream.getTracks().forEach(track => track.stop());
    }
    
    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    if (this.onCallStatusChange) {
         this.onCallStatusChange('ENDED');
    }
  }

  toggleMute(isMuted) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = !isMuted;
      });
    }
  }
}
