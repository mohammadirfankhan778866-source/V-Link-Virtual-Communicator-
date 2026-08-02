import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, SafeAreaView, StatusBar, Modal } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { collection, query, where, getDocs, onSnapshot, doc, getDoc, updateDoc } from 'firebase/firestore';

export default function HomeScreen({ navigation }) {
  const [currentUserData, setCurrentUserData] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [chats, setChats] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    const loadUserData = async () => {
      if (auth.currentUser) {
        const docRef = doc(db, 'users', auth.currentUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setCurrentUserData(docSnap.data());
        }
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    if (!currentUserData?.virtualId) return;

    // Listen for chats
    const chatsRef = collection(db, 'chats');
    const q = query(chatsRef, where('participants', 'array-contains', currentUserData.virtualId));
    
    const unsubChats = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort by lastUpdated locally
      chatList.sort((a, b) => b.lastUpdated?.toMillis() - a.lastUpdated?.toMillis());
      setChats(chatList);
    });

    // Listen for incoming calls
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

  const handleSearch = async () => {
    if (!searchId || searchId === currentUserData?.virtualId) return;
    
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('virtualId', '==', searchId));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      const contact = snapshot.docs[0].data();
      const chatId = [currentUserData.virtualId, contact.virtualId].sort().join('_');
      setSearchId('');
      navigation.navigate('Chat', { chatId, contactId: contact.virtualId, currentId: currentUserData.virtualId });
    } else {
      alert('User not found');
    }
  };

  const answerCall = () => {
    if (incomingCall) {
      navigation.navigate('Call', { 
        callId: incomingCall.id, 
        currentId: currentUserData.virtualId, 
        contactId: incomingCall.callerVirtualId,
        isCaller: false 
      });
    }
  };

  const rejectCall = async () => {
    if (incomingCall) {
      const callRef = doc(db, 'calls', incomingCall.id);
      await updateDoc(callRef, { status: 'REJECTED' });
      setIncomingCall(null);
    }
  };

  const getInitials = (id) => {
    return id ? id.substring(0, 2).toUpperCase() : '?';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Messages</Text>
          <Text style={styles.headerSubtitle}>My ID: {currentUserData?.virtualId || '...'}</Text>
        </View>
        <TouchableOpacity style={styles.profileAvatar}>
          <Text style={styles.avatarText}>{getInitials(currentUserData?.virtualId)}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput} 
          placeholder="Search 7-digit ID (XXX-XXXX)" 
          placeholderTextColor="#999"
          value={searchId}
          onChangeText={setSearchId}
        />
        <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
          <Text style={styles.searchButtonText}>Start</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={chats}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={() => (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No conversations yet.</Text>
            <Text style={styles.emptyStateSubtext}>Search for an ID to start chatting!</Text>
          </View>
        )}
        renderItem={({ item }) => {
          const contactId = item.participants.find(id => id !== currentUserData?.virtualId);
          return (
            <TouchableOpacity 
              style={styles.chatItem}
              activeOpacity={0.7}
              onPress={() => navigation.navigate('Chat', { chatId: item.id, contactId, currentId: currentUserData.virtualId })}
            >
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>{getInitials(contactId)}</Text>
              </View>
              <View style={styles.chatDetails}>
                <Text style={styles.chatTitle}>{contactId}</Text>
                <Text style={styles.chatPreview} numberOfLines={1}>
                  {item.lastMessage || 'No messages yet'}
                </Text>
              </View>
            </TouchableOpacity>
          );
        }}
      />

      {incomingCall && (
        <Modal transparent animationType="slide" visible={!!incomingCall}>
          <View style={styles.modalOverlay}>
            <View style={styles.incomingCallCard}>
              <View style={styles.incomingAvatar}>
                <Text style={styles.incomingAvatarText}>{getInitials(incomingCall.callerVirtualId)}</Text>
              </View>
              <Text style={styles.incomingTitle}>Incoming Call</Text>
              <Text style={styles.incomingId}>{incomingCall.callerVirtualId}</Text>
              
              <View style={styles.callActions}>
                <TouchableOpacity style={[styles.callActionButton, styles.rejectBtn]} onPress={rejectCall}>
                  <Text style={styles.callActionText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.callActionButton, styles.answerBtn]} onPress={answerCall}>
                  <Text style={styles.callActionText}>Answer</Text>
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
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  headerTitle: { fontSize: 32, fontWeight: '800', color: '#1C1C1E' },
  headerSubtitle: { fontSize: 16, color: '#007AFF', fontWeight: '600', marginTop: 4 },
  profileAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  avatarText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  searchInput: {
    flex: 1,
    height: 50,
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#1C1C1E',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    paddingHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  searchButtonText: { color: '#FFF', fontSize: 16, fontWeight: '600' },
  listContainer: { paddingHorizontal: 20, paddingBottom: 20 },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  chatAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F0F0F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  chatAvatarText: { fontSize: 18, fontWeight: '600', color: '#1C1C1E' },
  chatDetails: { flex: 1, justifyContent: 'center' },
  chatTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  chatPreview: { fontSize: 15, color: '#8E8E93' },
  emptyState: { alignItems: 'center', marginTop: 60 },
  emptyStateText: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginBottom: 8 },
  emptyStateSubtext: { fontSize: 15, color: '#8E8E93' },
  
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  incomingCallCard: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 32,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  incomingAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  incomingAvatarText: { fontSize: 36, color: '#FFF', fontWeight: 'bold' },
  incomingTitle: { fontSize: 20, color: '#8E8E93', marginBottom: 8 },
  incomingId: { fontSize: 32, fontWeight: '800', color: '#1C1C1E', marginBottom: 40 },
  callActions: {
    flexDirection: 'row',
    gap: 20,
    width: '100%',
  },
  callActionButton: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: 'center',
  },
  rejectBtn: { backgroundColor: '#FF3B30' },
  answerBtn: { backgroundColor: '#34C759' },
  callActionText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
});
