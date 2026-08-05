import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  FlatList, 
  Modal, 
  TextInput, 
  Alert, 
  Image 
} from 'react-native';
import { db } from '../firebaseConfig';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';

export default function StatusTab({ currentUserData, isGuest, savedContacts = [], onRequireAuth }) {
  const [myStatusText, setMyStatusText] = useState(currentUserData?.statusText || 'Hey there! I am using Virtual Communicator');
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [newStatusInput, setNewStatusInput] = useState('');
  const [contactStatuses, setContactStatuses] = useState([]);

  useEffect(() => {
    if (currentUserData?.statusText) {
      setMyStatusText(currentUserData.statusText);
    }
  }, [currentUserData]);

  useEffect(() => {
    const fetchStatuses = async () => {
      if (!savedContacts.length) return;
      const virtualIds = savedContacts.map(c => c.virtualId);
      const chunks = [];
      for (let i = 0; i < virtualIds.length; i += 10) {
        chunks.push(virtualIds.slice(i, i + 10));
      }
      
      let allStatuses = [];
      const colors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55'];
      
      for (const chunk of chunks) {
        const q = query(collection(db, 'users'), where('virtualId', 'in', chunk));
        const snapshot = await getDocs(q);
        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          const contact = savedContacts.find(c => c.virtualId === data.virtualId);
          allStatuses.push({
            id: docSnap.id,
            name: contact?.name || data.displayName || 'Unknown',
            virtualId: data.virtualId,
            statusText: data.statusText || 'Hey there! I am using Virtual Communicator',
            time: 'Recently',
            avatarColor: colors[Math.floor(Math.random() * colors.length)]
          });
        });
      }
      setContactStatuses(allStatuses);
    };
    fetchStatuses();
  }, [savedContacts]);

  const handleOpenEditStatus = () => {
    if (isGuest || !currentUserData || !currentUserData.uid) {
      if (onRequireAuth) onRequireAuth('post a status update');
      else Alert.alert('Sign In Required', 'Please sign in to update your status!');
      return;
    }
    setNewStatusInput(myStatusText);
    setEditModalVisible(true);
  };

  const handleSaveStatus = async () => {
    if (!newStatusInput.trim()) return;
    const text = newStatusInput.trim();
    setMyStatusText(text);
    setEditModalVisible(false);

    if (currentUserData?.uid) {
      try {
        const userRef = doc(db, 'users', currentUserData.uid);
        await setDoc(userRef, { statusText: text, statusUpdatedAt: new Date() }, { merge: true });
      } catch (err) {
        console.warn('Error saving status update:', err);
      }
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={styles.container}>
      {/* My Status Card */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>MY STATUS</Text>
      </View>

      <TouchableOpacity 
        style={styles.myStatusCard} 
        onPress={handleOpenEditStatus}
        activeOpacity={0.8}
      >
        <View style={styles.avatarRing}>
          <View style={styles.myAvatar}>
            <Text style={styles.myAvatarInitials}>
              {getInitials(currentUserData?.displayName || 'Me')}
            </Text>
          </View>
          <View style={styles.addBadge}>
            <Text style={styles.addBadgeIcon}>+</Text>
          </View>
        </View>

        <View style={styles.statusContent}>
          <Text style={styles.statusName}>
            {currentUserData?.displayName || 'My Status'}
          </Text>
          <Text style={styles.statusSubtext} numberOfLines={1}>
            {myStatusText}
          </Text>
        </View>

        <View style={styles.editBtnIcon}>
          <Text style={{ fontSize: 16 }}>✏️</Text>
        </View>
      </TouchableOpacity>

      {/* Recent Updates Section */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>RECENT UPDATES</Text>
      </View>

      <FlatList
        data={contactStatuses}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.contactStatusRow} 
            activeOpacity={0.7}
            onPress={() => {
              Alert.alert(
                item.name, 
                `"${item.statusText}"\n\nVirtual ID: ${item.virtualId}`
              );
            }}
          >
            <View style={[styles.storyCircle, { borderColor: item.avatarColor }]}>
              <View style={[styles.contactAvatar, { backgroundColor: item.avatarColor }]}>
                <Text style={styles.avatarInitials}>{getInitials(item.name)}</Text>
              </View>
            </View>

            <View style={styles.statusContent}>
              <Text style={styles.contactName}>{item.name}</Text>
              <Text style={styles.contactStatusText} numberOfLines={1}>{item.statusText}</Text>
            </View>

            <Text style={styles.timeText}>{item.time}</Text>
          </TouchableOpacity>
        )}
      />

      
      {/* Floating Action Button for Status */}
      <TouchableOpacity 
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: '#007AFF',
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5
        }}
        onPress={handleOpenEditStatus}
        activeOpacity={0.8}
      >
        <Text style={{color: '#FFF', fontSize: 24, fontWeight: 'bold'}}>+</Text>
      </TouchableOpacity>

      {/* Edit Status Modal */}
      <Modal transparent visible={editModalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Update Your Status</Text>
            <Text style={styles.modalSubtitle}>Share a short status note with your Virtual Communicator contacts.</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="e.g. Available for HD Calls 📞"
              placeholderTextColor="#A0A0A0"
              value={newStatusInput}
              onChangeText={setNewStatusInput}
              maxLength={70}
              autoFocus
            />

            <View style={styles.modalActions}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.saveBtn} 
                onPress={handleSaveStatus}
              >
                <Text style={styles.saveText}>Save Status</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1.2,
  },
  myStatusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  avatarRing: {
    position: 'relative',
    marginRight: 14,
  },
  myAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  myAvatarInitials: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 18,
  },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#25D366',
    borderWidth: 2,
    borderColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addBadgeIcon: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
    marginTop: -2,
  },
  statusContent: {
    flex: 1,
  },
  statusName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  statusSubtext: {
    fontSize: 13,
    color: '#8E8E93',
  },
  editBtnIcon: {
    padding: 8,
    backgroundColor: '#F0F0F5',
    borderRadius: 20,
  },
  listContainer: {
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E5E5EA',
  },
  contactStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
  },
  storyCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  contactAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  contactStatusText: {
    fontSize: 13,
    color: '#666',
  },
  timeText: {
    fontSize: 11,
    color: '#8E8E93',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginBottom: 16,
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1C1C1E',
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
  },
  cancelText: {
    color: '#8E8E93',
    fontWeight: '700',
    fontSize: 14,
  },
  saveBtn: {
    flex: 2,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: '#25D366',
    alignItems: 'center',
  },
  saveText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 14,
  },
});
