import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Animated, Alert } from 'react-native';
import { WebRTCService } from '../services/webrtcService';
import { RTCView } from 'react-native-webrtc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function CallScreen({ route, navigation }) {
  const { callId, contactId, currentId, isCaller } = route.params;
  const insets = useSafeAreaInsets();
  
  const [callStatus, setCallStatus] = useState(isCaller ? 'Calling...' : 'Connecting...');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const webrtcService = useRef(null);
  const [remoteStreamURL, setRemoteStreamURL] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();

    const initCall = async () => {
      const service = new WebRTCService(currentId, contactId);
      webrtcService.current = service;

      service.onRemoteStream = (stream) => {
        setRemoteStreamURL(stream.toURL());
      };

      service.onCallStatusChange = (status) => {
        setCallStatus(status);
        if (status === 'ENDED' || status === 'REJECTED') {
          setTimeout(() => navigation.goBack(), 500); // Small delay for UX
        }
      };

      if (isCaller) {
        await service.startCall();
      } else {
        await service.answerCall(callId);
      }
    };

    initCall();

    return () => {
      if (webrtcService.current) {
        webrtcService.current.endCall();
      }
    };
  }, []);

  const handleEndCall = () => {
    if (webrtcService.current) {
      webrtcService.current.endCall();
    }
  };

  const toggleMute = () => {
    const newMuteState = !isMuted;
    setIsMuted(newMuteState);
    if (webrtcService.current) {
      webrtcService.current.toggleMute(newMuteState);
    }
  };

  const toggleSpeaker = () => setIsSpeaker(!isSpeaker);
  const toggleRecording = () => {
    setIsRecording(!isRecording);
    Alert.alert('Recording', !isRecording ? 'Call recording started.' : 'Call recording stopped and saved.');
  };
  const handleMergeCall = () => Alert.alert('Add Call', 'Select a contact to merge into this call.');
  const toggleVideo = () => setIsVideoOn(!isVideoOn);
  const showKeypad = () => Alert.alert('Dialer', 'Dial pad would appear here.');

  const getInitials = (id) => id ? id.substring(0, 2).toUpperCase() : '?';

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar barStyle="light-content" />
      
      {remoteStreamURL && isVideoOn && (
        <RTCView streamURL={remoteStreamURL} style={styles.fullScreenVideo} objectFit="cover" />
      )}

      <View style={styles.topSection}>
        <Text style={styles.title}>Virtual Communicator Call</Text>
      </View>

      <View style={styles.middleSection}>
        <Animated.View style={[styles.avatarContainer, (callStatus === 'Calling...' || callStatus === 'OFFERING') && { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.avatarText}>{getInitials(contactId)}</Text>
        </Animated.View>
        <Text style={styles.contactId}>{contactId}</Text>
        <Text style={styles.statusText}>{isRecording ? `⏺ Recording... ${callStatus}` : callStatus}</Text>
      </View>

      <View style={styles.bottomSection}>
        {/* Row 1 */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={[styles.controlButton, isMuted && styles.controlButtonActive]} onPress={toggleMute}>
            <Text style={{ fontSize: 24 }}>{isMuted ? '🎙️' : '🎤'}</Text>
            <Text style={[styles.controlButtonText, isMuted && styles.controlButtonTextActive]}>Mute</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.controlButton} onPress={showKeypad}>
            <Text style={{ fontSize: 24 }}>🔢</Text>
            <Text style={styles.controlButtonText}>Keypad</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, isSpeaker && styles.controlButtonActive]} onPress={toggleSpeaker}>
            <Text style={{ fontSize: 24 }}>🔊</Text>
            <Text style={[styles.controlButtonText, isSpeaker && styles.controlButtonTextActive]}>Speaker</Text>
          </TouchableOpacity>
        </View>

        {/* Row 2 */}
        <View style={styles.controlsRow}>
          <TouchableOpacity style={styles.controlButton} onPress={handleMergeCall}>
            <Text style={{ fontSize: 24 }}>➕</Text>
            <Text style={styles.controlButtonText}>Add Call</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, isVideoOn && styles.controlButtonActive]} onPress={toggleVideo}>
            <Text style={{ fontSize: 24 }}>{isVideoOn ? '📷' : '🚫'}</Text>
            <Text style={[styles.controlButtonText, isVideoOn && styles.controlButtonTextActive]}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.controlButton, isRecording && styles.controlButtonActive]} onPress={toggleRecording}>
            <Text style={{ fontSize: 24 }}>⏺</Text>
            <Text style={[styles.controlButtonText, isRecording && styles.controlButtonTextActive]}>Record</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <Text style={{ fontSize: 32 }}>📞</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1C1E' },
  fullScreenVideo: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: -1 },
  topSection: { padding: 20, alignItems: 'center', marginTop: 10 },
  title: { color: '#8E8E93', fontSize: 14, fontWeight: '500', letterSpacing: 0.5 },
  middleSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#2C2C2E',
  },
  avatarText: { fontSize: 40, color: '#FFF', fontWeight: 'bold' },
  contactId: { fontSize: 28, color: '#FFF', fontWeight: '400', marginBottom: 8 },
  statusText: { fontSize: 16, color: '#8E8E93', fontWeight: '400' },
  bottomSection: { padding: 30, paddingBottom: 40 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 20 },
  controlButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: { backgroundColor: '#FFF' },
  controlButtonText: { color: '#FFF', fontSize: 12, marginTop: 4 },
  controlButtonTextActive: { color: '#1C1C1E' },
  endCallButton: {
    backgroundColor: '#FF3B30',
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 10,
    transform: [{ rotate: '135deg' }]
  },
});
