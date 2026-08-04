import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity,
  Pressable,
  StyleSheet, 
  SafeAreaView, 
  StatusBar, 
  Modal, 
  Alert 
} from 'react-native';
import { BlurView } from 'expo-blur';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { subscribeSavedContacts } from '../services/contactService';

import DialerTab from '../components/DialerTab';
import MessengerTab from '../components/MessengerTab';
import CallHistoryTab from '../components/CallHistoryTab';
import StatusTab from '../components/StatusTab';
import ProfileTab from '../components/ProfileTab';

import { registerUser } from '../services/virtualIdService';

export default function HomeScreen({ navigation, route }) {
  const [activeTab, setActiveTab] = useState('dialer'); // 'dialer' | 'messenger' | 'status' | 'profile'
  const [currentUserData, setCurrentUserData] = useState(null);
  const [savedContacts, setSavedContacts] = useState([]);
  const [chats, setChats] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);

  // Auth Modal State for Guest Mode
  const [authRequiredModal, setAuthRequiredModal] = useState({ visible: false, actionName: '' });

  const isGuest = route.params?.isGuest || !auth.currentUser || auth.currentUser?.isAnonymous && !currentUserData?.virtualId;

  const triggerRequireAuth = (actionName = 'use this feature') => {
    setAuthRequiredModal({ visible: true, actionName });
  };

  useEffect(() => {
    if (!auth.currentUser || auth.currentUser.isAnonymous) {
      if (!currentUserData) {
        // Set a default guest profile
        setCurrentUserData({
          displayName: 'Guest User',
          virtualId: 'Guest Mode',
          isGuest: true
        });
      }
      return;
    }

    // Immediately fetch & set user state so UI updates instantly
    registerUser(auth.currentUser).then((data) => {
      if (data) setCurrentUserData(data);
    });

    const docRef = doc(db, 'users', auth.currentUser.uid);
    const unsubUser = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserData(docSnap.data());
      }
    }, (err) => {
      console.warn('User snapshot subscription error:', err);
    });

    return () => unsubUser();
  }, []);

  // Subscribe to saved contacts
  useEffect(() => {
    if (isGuest) return;
    const unsubContacts = subscribeSavedContacts((list) => {
      setSavedContacts(list);
    });
    return () => unsubContacts();
  }, [isGuest]);

  // Subscribe to chats and incoming calls
  useEffect(() => {
    if (isGuest || !currentUserData?.virtualId || currentUserData?.virtualId === 'Guest Mode') return;

    // Listen for active chats
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', currentUserData.virtualId));
    
    const unsubChats = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      chatList.sort((a, b) => (b.lastUpdated?.toMillis ? b.lastUpdated.toMillis() : 0) - (a.lastUpdated?.toMillis ? a.lastUpdated.toMillis() : 0));
      setChats(chatList);
    });

    // Listen for incoming WebRTC calls
    const callsRef = collection(db, 'calls');
    const callsQuery = query(callsRef, where('receiverVirtualId', '==', currentUserData.virtualId));
    const unsubCalls = onSnapshot(callsQuery, (snapshot) => {
      const callDoc = snapshot.docs.find(doc => doc.data().status === 'OFFERING');
      if (callDoc) {
        setIncomingCall({ id: callDoc.id, ...callDoc.data() });
      } else {
        setIncomingCall(null);
      }
    });

    return () => {
      unsubChats();
      unsubCalls();
    };
  }, [currentUserData, isGuest]);

  const answerCall = () => {
    if (incomingCall) {
      navigation.navigate('Call', { 
        callId: incomingCall.id, 
        currentId: currentUserData.virtualId, 
        contactId: incomingCall.callerVirtualId,
        isCaller: false 
      });
      setIncomingCall(null);
    }
  };

  const rejectCall = async () => {
    if (incomingCall) {
      const callRef = doc(db, 'calls', incomingCall.id);
      await updateDoc(callRef, { status: 'REJECTED' });
      setIncomingCall(null);
    }
  };

  const getInitials = (id) => id ? id.substring(0, 2).toUpperCase() : '?';

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'dialer': return 'Phone';
      case 'messenger': return 'Messages';
      case 'status': return 'Status';
      case 'profile': return 'My Account';
      default: return 'Virtual Communicator';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerAppTitle}>Virtual Communicator</Text>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
        </View>

        <View style={styles.headerRight}>
          <View style={[styles.idBadge, isGuest && styles.guestBadge]}>
            <Text style={[styles.idBadgeText, isGuest && styles.guestBadgeText]}>
              {isGuest ? '⚡ Guest Mode' : `ID: ${currentUserData?.virtualId || '...'}`}
            </Text>
          </View>

          <TouchableOpacity 
            style={styles.profileHeaderBtn} 
            onPress={() => setActiveTab('profile')}
          >
            <Text style={styles.profileHeaderInitials}>
              {isGuest ? '👤' : getInitials(currentUserData?.displayName || currentUserData?.virtualId)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area based on Active Taskbar Section */}
      <View style={styles.mainContent}>
        {activeTab === 'dialer' && (
          <DialerTab 
            currentUserData={currentUserData} 
            savedContacts={savedContacts}
            navigation={navigation} 
            isGuest={isGuest}
            onRequireAuth={triggerRequireAuth}
          />
        )}
        {activeTab === 'messenger' && (
          <MessengerTab 
            currentUserData={currentUserData} 
            chats={chats} 
            savedContacts={savedContacts}
            navigation={navigation} 
            isGuest={isGuest}
            onRequireAuth={triggerRequireAuth}
          />
        )}
        {activeTab === 'status' && (
          <StatusTab 
            currentUserData={currentUserData} 
            isGuest={isGuest}
            onRequireAuth={triggerRequireAuth}
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab 
            currentUserData={currentUserData} 
            savedContacts={savedContacts}
            navigation={navigation} 
            isGuest={isGuest}
            onRequireAuth={triggerRequireAuth}
          />
        )}
      </View>

      {/* Capsule Glassy Shaped Bottom Taskbar (Apple Style) */}
      <BlurView intensity={80} tint="light" style={styles.glassyCapsuleTaskbar}>
        
        {/* Phone Tab */}
        <Pressable 
          style={styles.taskbarItem} 
          onPress={() => setActiveTab('dialer')}
          android_ripple={{ color: 'rgba(0, 122, 255, 0.2)', borderless: true, radius: 40 }}
        >
          <View style={[styles.taskbarIconWrapper, activeTab === 'dialer' && styles.activeIconWrapper]}>
            <Text style={[styles.taskbarIcon, activeTab === 'dialer' && styles.activeTaskbarIcon]}>📞</Text>
          </View>
          <Text style={[styles.taskbarLabel, activeTab === 'dialer' && styles.activeTaskbarLabel]}>Phone</Text>
        </Pressable>

        {/* Messages Tab */}
        <Pressable 
          style={styles.taskbarItem} 
          onPress={() => setActiveTab('messenger')}
          android_ripple={{ color: 'rgba(0, 122, 255, 0.2)', borderless: true, radius: 40 }}
        >
          <View style={[styles.taskbarIconWrapper, activeTab === 'messenger' && styles.activeIconWrapper]}>
            <Text style={[styles.taskbarIcon, activeTab === 'messenger' && styles.activeTaskbarIcon]}>💬</Text>
            {savedContacts.length > 0 && !isGuest && (
              <View style={styles.badgeDot} />
            )}
          </View>
          <Text style={[styles.taskbarLabel, activeTab === 'messenger' && styles.activeTaskbarLabel]}>Message</Text>
        </Pressable>

        {/* Status Tab */}
        <Pressable 
          style={styles.taskbarItem} 
          onPress={() => setActiveTab('status')}
          android_ripple={{ color: 'rgba(0, 122, 255, 0.2)', borderless: true, radius: 40 }}
        >
          <View style={[styles.taskbarIconWrapper, activeTab === 'status' && styles.activeIconWrapper]}>
            <Text style={[styles.taskbarIcon, activeTab === 'status' && styles.activeTaskbarIcon]}>⭕</Text>
          </View>
          <Text style={[styles.taskbarLabel, activeTab === 'status' && styles.activeTaskbarLabel]}>Status</Text>
        </Pressable>

        {/* Profile Tab */}
        <Pressable 
          style={styles.taskbarItem} 
          onPress={() => setActiveTab('profile')}
          android_ripple={{ color: 'rgba(0, 122, 255, 0.2)', borderless: true, radius: 40 }}
        >
          <View style={[styles.taskbarIconWrapper, activeTab === 'profile' && styles.activeIconWrapper]}>
            <Text style={[styles.taskbarIcon, activeTab === 'profile' && styles.activeTaskbarIcon]}>👤</Text>
          </View>
          <Text style={[styles.taskbarLabel, activeTab === 'profile' && styles.activeTaskbarLabel]}>Profile</Text>
        </Pressable>

      </BlurView>

      {/* Auth Required Modal Overlay (for Guest Mode protection) */}
      <Modal transparent animationType="fade" visible={authRequiredModal.visible}>
        <View style={styles.modalOverlay}>
          <View style={styles.authRequiredCard}>
            <View style={styles.lockIconFrame}>
              <Text style={{ fontSize: 36 }}>🔒</Text>
            </View>
            <Text style={styles.authModalTitle}>Account Required</Text>
            <Text style={styles.authModalSubtitle}>
              Please sign in or create an account to {authRequiredModal.actionName} on Virtual Communicator.
            </Text>

            <TouchableOpacity 
              style={styles.signInNowBtn} 
              onPress={() => {
                setAuthRequiredModal({ visible: false, actionName: '' });
                navigation.replace('Login');
              }}
            >
              <Text style={styles.signInNowText}>Sign In / Create Account</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.cancelAuthBtn} 
              onPress={() => setAuthRequiredModal({ visible: false, actionName: '' })}
            >
              <Text style={styles.cancelAuthText}>Continue Browsing</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Incoming Call Modal Overlay */}
      {incomingCall && (
        <Modal transparent animationType="slide" visible={!!incomingCall}>
          <View style={styles.modalOverlay}>
            <View style={styles.incomingCallCard}>
              <View style={styles.incomingAvatar}>
                <Text style={styles.incomingAvatarText}>{getInitials(incomingCall.callerVirtualId)}</Text>
              </View>
              <Text style={styles.incomingSubtitle}>INCOMING HD CALL</Text>
              <Text style={styles.incomingId}>ID: {incomingCall.callerVirtualId}</Text>
              
              <View style={styles.callActions}>
                <TouchableOpacity style={[styles.callActionButton, styles.rejectBtn]} onPress={rejectCall}>
                  <Text style={styles.callActionText}>✕ Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callActionButton, styles.answerBtn]} onPress={answerCall}>
                  <Text style={styles.callActionText}>📞 Answer</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  headerLeft: {
    flex: 1,
  },
  headerAppTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#007AFF',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    marginTop: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  idBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  guestBadge: {
    backgroundColor: '#FFF3CD',
  },
  idBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#007AFF',
  },
  guestBadgeText: {
    color: '#856404',
  },
  profileHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  profileHeaderInitials: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  mainContent: {
    flex: 1,
    paddingBottom: 85, // Space for floating glassy bottom capsule
  },
  // Capsule Glassy Shaped Bottom Taskbar
  glassyCapsuleTaskbar: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 36,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.6)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
    paddingHorizontal: 8,
    overflow: 'hidden', // Ensures the ripple effect stays within the rounded capsule
  },
  taskbarItem: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 36, // Apple-style round touch areas
  },
  taskbarIconWrapper: {
    width: 42,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
    marginBottom: 2,
    position: 'relative',
  },
  activeIconWrapper: {
    backgroundColor: '#E5F1FF',
  },
  taskbarIcon: {
    fontSize: 18,
    opacity: 0.6,
  },
  activeTaskbarIcon: {
    opacity: 1,
  },
  taskbarLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTaskbarLabel: {
    color: '#007AFF',
    fontWeight: '800',
  },
  badgeDot: {
    position: 'absolute',
    top: 2,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#25D366',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  authRequiredCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  lockIconFrame: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#E5F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  authModalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
  },
  authModalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  signInNowBtn: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  signInNowText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  cancelAuthBtn: {
    paddingVertical: 10,
  },
  cancelAuthText: {
    color: '#8E8E93',
    fontSize: 14,
    fontWeight: '600',
  },
  incomingCallCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    alignItems: 'center',
    width: '100%',
  },
  incomingAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  incomingAvatarText: {
    fontSize: 32,
    color: '#FFF',
    fontWeight: 'bold',
  },
  incomingSubtitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  incomingId: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 32,
  },
  callActions: {
    flexDirection: 'row',
    gap: 16,
    width: '100%',
  },
  callActionButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  rejectBtn: {
    backgroundColor: '#FF3B30',
  },
  answerBtn: {
    backgroundColor: '#34C759',
  },
  callActionText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
