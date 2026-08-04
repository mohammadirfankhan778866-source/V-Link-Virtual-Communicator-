import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, StatusBar, Modal } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';
import { subscribeSavedContacts } from '../services/contactService';

import DialerTab from '../components/DialerTab';
import MessengerTab from '../components/MessengerTab';
import CallHistoryTab from '../components/CallHistoryTab';
import ProfileTab from '../components/ProfileTab';

export default function HomeScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('dialer'); // 'dialer' | 'messenger' | 'history' | 'profile'
  const [currentUserData, setCurrentUserData] = useState(null);
  const [savedContacts, setSavedContacts] = useState([]);
  const [chats, setChats] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;
    const docRef = doc(db, 'users', auth.currentUser.uid);
    const unsubUser = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserData(docSnap.data());
      }
    });
    return () => unsubUser();
  }, []);

  // Subscribe to saved contacts
  useEffect(() => {
    const unsubContacts = subscribeSavedContacts((list) => {
      setSavedContacts(list);
    });
    return () => unsubContacts();
  }, []);

  // Subscribe to chats and incoming calls
  useEffect(() => {
    if (!currentUserData?.virtualId) return;

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
  }, [currentUserData]);

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
      case 'dialer': return 'Keypad & Dialer';
      case 'messenger': return 'Messenger & Contacts';
      case 'history': return 'Call History';
      case 'profile': return 'My Account & ID';
      default: return 'VoIP App';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>{getHeaderTitle()}</Text>
          <View style={styles.idBadge}>
            <Text style={styles.idBadgeText}>ID: {currentUserData?.virtualId || 'Loading...'}</Text>
          </View>
        </View>

        <TouchableOpacity 
          style={styles.profileHeaderBtn} 
          onPress={() => setActiveTab('profile')}
        >
          <Text style={styles.profileHeaderInitials}>
            {getInitials(currentUserData?.displayName || currentUserData?.virtualId)}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Content Area based on Active Taskbar Section */}
      <View style={styles.mainContent}>
        {activeTab === 'dialer' && (
          <DialerTab 
            currentUserData={currentUserData} 
            savedContacts={savedContacts}
            navigation={navigation} 
          />
        )}
        {activeTab === 'messenger' && (
          <MessengerTab 
            currentUserData={currentUserData} 
            chats={chats} 
            savedContacts={savedContacts}
            navigation={navigation} 
          />
        )}
        {activeTab === 'history' && (
          <CallHistoryTab 
            currentUserData={currentUserData} 
            savedContacts={savedContacts}
            navigation={navigation} 
          />
        )}
        {activeTab === 'profile' && (
          <ProfileTab 
            currentUserData={currentUserData} 
            savedContacts={savedContacts}
            navigation={navigation} 
          />
        )}
      </View>

      {/* 4-Section Taskbar (Bottom Navigation Bar) */}
      <View style={styles.taskbar}>
        <TouchableOpacity 
          style={styles.taskbarItem} 
          onPress={() => setActiveTab('dialer')}
          activeOpacity={0.7}
        >
          <View style={[styles.taskbarIconWrapper, activeTab === 'dialer' && styles.activeIconWrapper]}>
            <Text style={[styles.taskbarIcon, activeTab === 'dialer' && styles.activeTaskbarIcon]}>⌨️</Text>
          </View>
          <Text style={[styles.taskbarLabel, activeTab === 'dialer' && styles.activeTaskbarLabel]}>Dialer</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.taskbarItem} 
          onPress={() => setActiveTab('messenger')}
          activeOpacity={0.7}
        >
          <View style={[styles.taskbarIconWrapper, activeTab === 'messenger' && styles.activeIconWrapper]}>
            <Text style={[styles.taskbarIcon, activeTab === 'messenger' && styles.activeTaskbarIcon]}>💬</Text>
            {savedContacts.length > 0 && (
              <View style={styles.badgeDot} />
            )}
          </View>
          <Text style={[styles.taskbarLabel, activeTab === 'messenger' && styles.activeTaskbarLabel]}>Messenger</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.taskbarItem} 
          onPress={() => setActiveTab('history')}
          activeOpacity={0.7}
        >
          <View style={[styles.taskbarIconWrapper, activeTab === 'history' && styles.activeIconWrapper]}>
            <Text style={[styles.taskbarIcon, activeTab === 'history' && styles.activeTaskbarIcon]}>📜</Text>
          </View>
          <Text style={[styles.taskbarLabel, activeTab === 'history' && styles.activeTaskbarLabel]}>Call History</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.taskbarItem} 
          onPress={() => setActiveTab('profile')}
          activeOpacity={0.7}
        >
          <View style={[styles.taskbarIconWrapper, activeTab === 'profile' && styles.activeIconWrapper]}>
            <Text style={[styles.taskbarIcon, activeTab === 'profile' && styles.activeTaskbarIcon]}>👤</Text>
          </View>
          <Text style={[styles.taskbarLabel, activeTab === 'profile' && styles.activeTaskbarLabel]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* Incoming Call Modal Overlay */}
      {incomingCall && (
        <Modal transparent animationType="slide" visible={!!incomingCall}>
          <View style={styles.modalOverlay}>
            <View style={styles.incomingCallCard}>
              <View style={styles.incomingAvatar}>
                <Text style={styles.incomingAvatarText}>{getInitials(incomingCall.callerVirtualId)}</Text>
              </View>
              <Text style={styles.incomingSubtitle}>INCOMING VOIP CALL</Text>
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
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  idBadge: {
    backgroundColor: '#E5F1FF',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10,
    marginTop: 4,
  },
  idBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
  },
  profileHeaderBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
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
    fontSize: 16,
  },
  mainContent: {
    flex: 1,
  },
  taskbar: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
    paddingBottom: 6,
    paddingTop: 4,
  },
  taskbarItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskbarIconWrapper: {
    width: 38,
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
    right: 4,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34C759',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  incomingCallCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    alignItems: 'center',
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
