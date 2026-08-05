import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, Modal, Alert } from 'react-native';
import { saveContact, deleteContact } from '../services/contactService';

export default function MessengerTab({ currentUserData, chats, savedContacts, navigation, isGuest, onRequireAuth }) {
  const [activeSegment, setActiveSegment] = useState('saved'); // 'saved' | 'chats'
  const [searchQuery, setSearchQuery] = useState('');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newVirtualId, setNewVirtualId] = useState('');
  const [groupName, setGroupName] = useState('');
  const [groups, setGroups] = useState([]);
  const [createGroupModal, setCreateGroupModal] = useState(false);
  const [newName, setNewName] = useState('');

  const getInitials = (str) => {
    if (!str) return '?';
    const words = str.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const handleAddContact = async () => {
    if (isGuest) {
      if (onRequireAuth) onRequireAuth('add contacts');
      else Alert.alert('Sign In Required', 'Please sign in or create an account to add contacts!');
      return;
    }
    const rawDigits = newVirtualId.replace(/\D/g, '');
    if (rawDigits.length < 7 || rawDigits.length > 10) {
      Alert.alert('Invalid ID', 'Please enter a valid 10-digit Phone / Virtual Number ID.');
      return;
    }
    if (rawDigits === currentUserData?.virtualId?.replace(/\D/g, '')) {
      Alert.alert('Invalid', 'You cannot add your own Virtual ID as a contact.');
      return;
    }
    if (!newName.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for your contact.');
      return;
    }

    try {
      await saveContact(rawDigits, newName.trim());
      Alert.alert('Success', `Added "${newName.trim()}" to saved contacts!`);
      setAddModalVisible(false);
      setNewVirtualId('');
      setNewName('');
    } catch (err) {
      Alert.alert('Error', 'Failed to save contact.');
    }
  };

  const handleDeleteContact = (contact) => {
    Alert.alert(
      'Remove Contact',
      `Are you sure you want to remove ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            await deleteContact(contact.virtualId);
          }
        }
      ]
    );
  };

  // Filtered lists
  const filteredContacts = savedContacts.filter(c => {
    const q = searchQuery.toLowerCase();
    return (c.name && c.name.toLowerCase().includes(q)) || (c.virtualId && c.virtualId.includes(q));
  });

  const filteredChats = chats.filter(c => {
    const contactId = c.participants?.find(id => id !== currentUserData?.virtualId);
    const q = searchQuery.toLowerCase();
    return contactId && contactId.toLowerCase().includes(q);
  });

  return (
    <View style={styles.container}>
      {/* Search & Add Header */}
      <View style={styles.searchRow}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search saved contacts or IDs..."
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Text style={styles.clearSearchText}>✕</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity 
          style={styles.addButton} 
          onPress={() => setAddModalVisible(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.addButtonIcon}>+</Text>
        </TouchableOpacity>
      </View>

      {/* Segment Switcher */}
      
      <View style={styles.segmentContainer}>
        <TouchableOpacity 
          style={[styles.segmentTab, activeSegment === 'chats' && styles.activeSegmentTab]}
          onPress={() => setActiveSegment('chats')}
        >
          <Text style={[styles.segmentText, activeSegment === 'chats' && styles.activeSegmentText]}>
            Recent Chats ({chats.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.segmentTab, activeSegment === 'saved' && styles.activeSegmentTab]}
          onPress={() => setActiveSegment('saved')}
        >
          <Text style={[styles.segmentText, activeSegment === 'saved' && styles.activeSegmentText]}>
            Saved ({savedContacts.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={[styles.segmentTab, activeSegment === 'groups' && styles.activeSegmentTab]}
          onPress={() => setActiveSegment('groups')}
        >
          <Text style={[styles.segmentText, activeSegment === 'groups' && styles.activeSegmentText]}>
            Groups ({groups.length})
          </Text>
        </TouchableOpacity>
      </View>


      
      {/* Content List */}
      {activeSegment === 'groups' && (
        <FlatList
          data={groups}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No Groups Yet</Text>
              <Text style={styles.emptySubtext}>
                Create a group to message or video call multiple people at once.
              </Text>
            </View>
          )}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={styles.chatCard}
              activeOpacity={0.7}
              onPress={() => Alert.alert('Group Options', 'Start a group chat or video call?', [
                 { text: 'Cancel', style: 'cancel' },
                 { text: 'Chat', onPress: () => Alert.alert('Notice', 'Group chat feature coming soon!') },
                 { text: 'Video Call', onPress: () => navigation.navigate('Call', { contactId: item.name, currentId: currentUserData?.virtualId, isCaller: true }) }
              ])}
            >
              <View style={[styles.avatarCircle, { backgroundColor: '#FF9500' }]}>
                <Text style={[styles.avatarText, { color: '#FFF' }]}>{item.name[0]}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactVirtualId}>{item.members} Members</Text>
              </View>
              <TouchableOpacity 
                style={[styles.iconActionBtn, styles.chatBtnBg]}
              >
                <Text style={styles.actionIconText}>💬</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.iconActionBtn, styles.callBtnBg]}
                onPress={() => navigation.navigate('Call', { contactId: item.name, currentId: currentUserData?.virtualId, isCaller: true })}
              >
                <Text style={styles.actionIconText}>📹</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      )}

      {activeSegment === 'saved' && (
        <FlatList
          data={filteredContacts}
          keyExtractor={item => item.virtualId}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>👥</Text>
              <Text style={styles.emptyTitle}>No Saved Contacts Yet</Text>
              <Text style={styles.emptySubtext}>
                Tap "+ Add Contact" or use the Dialer to save your friends' Virtual Number IDs!
              </Text>
              <TouchableOpacity style={styles.addFirstBtn} onPress={() => setAddModalVisible(true)}>
                <Text style={styles.addFirstBtnText}>+ Add First Contact</Text>
              </TouchableOpacity>
            </View>
          )}
          renderItem={({ item }) => (
            <View style={styles.contactCard}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{getInitials(item.name)}</Text>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <Text style={styles.contactVirtualId}>ID: {item.virtualId}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity 
                  style={[styles.iconActionBtn, styles.chatBtnBg]}
                  onPress={() => {
                    const chatId = [currentUserData?.virtualId, item.virtualId].sort().join('_');
                    navigation.navigate('Chat', { chatId, contactId: item.virtualId, currentId: currentUserData?.virtualId });
                  }}
                >
                  <Text style={styles.actionIconText}>💬</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.iconActionBtn, styles.callBtnBg]}
                  onPress={() => {
                    navigation.navigate('Call', { contactId: item.virtualId, currentId: currentUserData?.virtualId, isCaller: true });
                  }}
                >
                  <Text style={styles.actionIconText}>📞</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.deleteBtn}
                  onPress={() => handleDeleteContact(item)}
                >
                  <Text style={styles.deleteIconText}>🗑️</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        />
      )}

      {activeSegment === 'chats' && (
        <FlatList
          data={filteredChats}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>💬</Text>
              <Text style={styles.emptyTitle}>No Recent Conversations</Text>
              <Text style={styles.emptySubtext}>
                Start a message with any Virtual Number ID from your Saved Guys or Dialer!
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const contactId = item.participants?.find(id => id !== currentUserData?.virtualId);
            const savedMatch = savedContacts.find(c => c.virtualId === contactId);
            const displayName = savedMatch ? savedMatch.name : `Virtual ID: ${contactId}`;
            return (
              <TouchableOpacity 
                style={styles.chatCard}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('Chat', { chatId: item.id, contactId, currentId: currentUserData?.virtualId })}
              >
                <View style={[styles.avatarCircle, { backgroundColor: '#007AFF' }]}>
                  <Text style={[styles.avatarText, { color: '#FFF' }]}>{getInitials(displayName)}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactName}>{displayName}</Text>
                  <Text style={styles.chatPreview} numberOfLines={1}>
                    {item.lastMessage || 'Tap to send a message'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={[styles.iconActionBtn, styles.callBtnBg]}
                  onPress={() => {
                    navigation.navigate('Call', { contactId, currentId: currentUserData?.virtualId, isCaller: true });
                  }}
                >
                  <Text style={styles.actionIconText}>📞</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* Add Contact Modal */}
      <Modal visible={addModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save New Contact</Text>
            <Text style={styles.modalSubtitle}>Save a guy by Virtual Number ID to message or call easily</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="7-digit Virtual ID (e.g. 123-4567)"
              placeholderTextColor="#8E8E93"
              value={newVirtualId}
              onChangeText={setNewVirtualId}
              keyboardType="numeric"
            />

            <TextInput
              style={styles.modalInput}
              placeholder="Contact Name (e.g. David)"
              placeholderTextColor="#8E8E93"
              value={newName}
              onChangeText={setNewName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.modalBtn, styles.confirmBtn]} 
                onPress={handleAddContact}
              >
                <Text style={styles.confirmBtnText}>Save Contact</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Create Group Modal */}
      <Modal visible={createGroupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <Text style={styles.modalSubtitle}>Create a group for multiple contacts</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Group Name (e.g. Family)"
              placeholderTextColor="#8E8E93"
              value={groupName}
              onChangeText={setGroupName}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setCreateGroupModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.confirmBtn]} 
                onPress={() => {
                  if(groupName.trim()){
                    setGroups([{ id: Date.now().toString(), name: groupName.trim(), members: 1 }, ...groups]);
                    setCreateGroupModal(false);
                    setGroupName('');
                  }
                }}
              >
                <Text style={styles.confirmBtnText}>Create Group</Text>
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
  searchRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    gap: 10,
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    height: 46,
    backgroundColor: '#FFF',
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1C1C1E',
  },
  clearSearchText: {
    fontSize: 14,
    color: '#8E8E93',
    padding: 4,
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  addButtonIcon: {
    color: '#FFF',
    fontSize: 26,
    fontWeight: '400',
    marginTop: -2,
  },
  segmentContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 10,
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    padding: 3,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  activeSegmentTab: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeSegmentText: {
    color: '#007AFF',
    fontWeight: '700',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  chatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 14,
    borderRadius: 18,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#E5F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#007AFF',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  contactVirtualId: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  chatPreview: {
    fontSize: 13,
    color: '#8E8E93',
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBtnBg: {
    backgroundColor: '#E5F1FF',
  },
  callBtnBg: {
    backgroundColor: '#E1F9E6',
  },
  actionIconText: {
    fontSize: 16,
  },
  deleteBtn: {
    padding: 6,
  },
  deleteIconText: {
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 6,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  addFirstBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 16,
  },
  addFirstBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#F0F0F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1C1C1E',
    marginBottom: 14,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F0F0F5',
  },
  cancelBtnText: {
    color: '#8E8E93',
    fontWeight: '700',
    fontSize: 15,
  },
  confirmBtn: {
    backgroundColor: '#007AFF',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 15,
  },
});
