import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, StatusBar, Animated } from 'react-native';
import { WebRTCService } from '../services/webrtcService';
import { RTCView } from 'react-native-webrtc';

export default function CallScreen({ route, navigation }) {
  const { callId, contactId, currentId, isCaller } = route.params;
  const [callStatus, setCallStatus] = useState(isCaller ? 'Calling...' : 'Connecting...');
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
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

  const toggleSpeaker = () => {
    setIsSpeaker(!isSpeaker);
  };

  const getInitials = (id) => id ? id.substring(0, 2).toUpperCase() : '?';

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      
      {remoteStreamURL && (
        <RTCView streamURL={remoteStreamURL} style={{ width: 0, height: 0 }} />
      )}

      <View style={styles.topSection}>
        <Text style={styles.title}>Audio Call</Text>
      </View>

      <View style={styles.middleSection}>
        <Animated.View style={[styles.avatarContainer, (callStatus === 'Calling...' || callStatus === 'OFFERING') && { transform: [{ scale: pulseAnim }] }]}>
          <Text style={styles.avatarText}>{getInitials(contactId)}</Text>
        </Animated.View>
        <Text style={styles.contactId}>{contactId}</Text>
        <Text style={styles.statusText}>{callStatus}</Text>
      </View>

      <View style={styles.bottomSection}>
        <View style={styles.controlsRow}>
          <TouchableOpacity style={[styles.controlButton, isMuted && styles.controlButtonActive]} onPress={toggleMute}>
            <Text style={[styles.controlButtonText, isMuted && styles.controlButtonTextActive]}>
              {isMuted ? 'Muted' : 'Mute'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={[styles.controlButton, isSpeaker && styles.controlButtonActive]} onPress={toggleSpeaker}>
            <Text style={[styles.controlButtonText, isSpeaker && styles.controlButtonTextActive]}>Speaker</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.endCallButton} onPress={handleEndCall}>
          <Text style={styles.endCallButtonText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1C1C1E' },
  topSection: { padding: 20, alignItems: 'center', marginTop: 20 },
  title: { color: '#8E8E93', fontSize: 16, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 1 },
  middleSection: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  avatarContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#3A3A3C',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    borderWidth: 4,
    borderColor: '#2C2C2E',
  },
  avatarText: { fontSize: 48, color: '#FFF', fontWeight: 'bold' },
  contactId: { fontSize: 32, color: '#FFF', fontWeight: '700', marginBottom: 12 },
  statusText: { fontSize: 18, color: '#34C759', fontWeight: '500' },
  bottomSection: { padding: 40, paddingBottom: 60 },
  controlsRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 40 },
  controlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonActive: { backgroundColor: '#FFF' },
  controlButtonText: { color: '#FFF', fontSize: 14, fontWeight: '600' },
  controlButtonTextActive: { color: '#1C1C1E' },
  endCallButton: {
    backgroundColor: '#FF3B30',
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#FF3B30',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
  },
  endCallButtonText: { color: '#FFF', fontSize: 20, fontWeight: 'bold' },
});
