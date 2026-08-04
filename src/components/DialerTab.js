import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, Animated } from 'react-native';
import { saveContact } from '../services/contactService';

export default function DialerTab({ currentUserData, navigation, savedContacts, isGuest, onRequireAuth }) {
  const [dialedNumber, setDialedNumber] = useState('');
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [contactNameInput, setContactNameInput] = useState('');
  const [matchedContact, setMatchedContact] = useState(null);

  // Format entered string as 10-digit ID (e.g. 9876543210 or 987-654-3210)
  const getFormattedNumber = (raw) => {
    const cleaned = raw.replace(/\D/g, '').slice(0, 10);
    if (cleaned.length > 6) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length > 3) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`;
    }
    return cleaned;
  };

  const handleKeyPress = (char) => {
    if (dialedNumber.replace(/\D/g, '').length < 10 || char === '*' || char === '#') {
      const next = dialedNumber + char;
      const formatted = getFormattedNumber(next);
      setDialedNumber(formatted);
    }
  };

  const handleBackspace = () => {
    const raw = dialedNumber.replace(/\D/g, '');
    if (raw.length > 0) {
      const sliced = raw.slice(0, -1);
      setDialedNumber(getFormattedNumber(sliced));
    }
  };

  const handleClear = () => {
    setDialedNumber('');
  };

  // Check if current dialed number matches a saved contact
  useEffect(() => {
    const cleaned = dialedNumber.trim();
    if (!cleaned) {
      setMatchedContact(null);
      return;
    }
    const found = savedContacts.find(c => c.virtualId === cleaned || c.virtualId.replace(/\D/g, '') === cleaned.replace(/\D/g, ''));
    setMatchedContact(found || null);
  }, [dialedNumber, savedContacts]);

  const handleCall = () => {
    if (isGuest) {
      if (onRequireAuth) onRequireAuth('make voice/video calls');
      else Alert.alert('Sign In Required', 'Please sign in or create an account to make calls!');
      return;
    }
    const rawDigits = dialedNumber.replace(/\D/g, '');
    if (rawDigits.length < 7 || rawDigits.length > 10) {
      Alert.alert('Invalid ID', 'Please enter a valid 10-digit Phone / Virtual Number ID.');
      return;
    }
    if (rawDigits === currentUserData?.virtualId?.replace(/\D/g, '')) {
      Alert.alert('Self Call', 'You cannot call your own Phone / Virtual Number ID.');
      return;
    }
    navigation.navigate('Call', {
      contactId: rawDigits,
      currentId: currentUserData?.virtualId,
      isCaller: true
    });
  };

  const handleOpenChat = () => {
    if (isGuest) {
      if (onRequireAuth) onRequireAuth('send messages');
      else Alert.alert('Sign In Required', 'Please sign in or create an account to send messages!');
      return;
    }
    const rawDigits = dialedNumber.replace(/\D/g, '');
    if (rawDigits.length < 7 || rawDigits.length > 10) {
      Alert.alert('Invalid ID', 'Please enter a valid 10-digit Phone / Virtual Number ID.');
      return;
    }
    const myId = currentUserData?.virtualId?.replace(/\D/g, '') || '';
    const chatId = [myId, rawDigits].sort().join('_');
    navigation.navigate('Chat', {
      chatId,
      contactId: rawDigits,
      currentId: currentUserData?.virtualId
    });
  };

  const handleSaveContact = async () => {
    const rawDigits = dialedNumber.replace(/\D/g, '');
    if (rawDigits.length < 7 || rawDigits.length > 10) {
      Alert.alert('Invalid ID', 'Please enter a valid 10-digit Phone / Virtual Number ID to save.');
      return;
    }
    if (!contactNameInput.trim()) {
      Alert.alert('Missing Name', 'Please enter a name for this contact.');
      return;
    }
    try {
      await saveContact(rawDigits, contactNameInput.trim());
      Alert.alert('Success', `Saved "${contactNameInput.trim()}" to Messenger contacts!`);
      setSaveModalVisible(false);
      setContactNameInput('');
    } catch (err) {
      Alert.alert('Error', 'Failed to save contact.');
    }
  };

  const keypadKeys = [
    [
      { main: '1', sub: '' },
      { main: '2', sub: 'ABC' },
      { main: '3', sub: 'DEF' }
    ],
    [
      { main: '4', sub: 'GHI' },
      { main: '5', sub: 'JKL' },
      { main: '6', sub: 'MNO' }
    ],
    [
      { main: '7', sub: 'PQRS' },
      { main: '8', sub: 'TUV' },
      { main: '9', sub: 'WXYZ' }
    ],
    [
      { main: '*', sub: '' },
      { main: '0', sub: '+' },
      { main: '#', sub: '' }
    ]
  ];

  return (
    <View style={styles.container}>
      {/* Top Display Area */}
      <View style={styles.displayContainer}>
        <Text style={styles.displaySubtitle}>VIRTUAL NUMBER DIALER</Text>
        <TextInput
          style={styles.displayInput}
          value={dialedNumber}
          placeholder="XXX-XXXX"
          placeholderTextColor="#C7C7CC"
          editable={false}
          numberOfLines={1}
        />
        {matchedContact ? (
          <View style={styles.matchedBadge}>
            <Text style={styles.matchedName}>👤 {matchedContact.name}</Text>
          </View>
        ) : dialedNumber.length > 0 ? (
          <TouchableOpacity 
            style={styles.quickSaveLink} 
            onPress={() => {
              setContactNameInput('');
              setSaveModalVisible(true);
            }}
          >
            <Text style={styles.quickSaveText}>+ Add to Saved Contacts</Text>
          </TouchableOpacity>
        ) : (
          <Text style={styles.hintText}>Enter 7-digit Virtual ID to call or save</Text>
        )}
      </View>

      {/* Dial Pad */}
      <View style={styles.keypadContainer}>
        {keypadKeys.map((row, rIdx) => (
          <View style={styles.row} key={`row-${rIdx}`}>
            {row.map((k) => (
              <TouchableOpacity
                key={k.main}
                style={styles.keyButton}
                activeOpacity={0.6}
                onPress={() => handleKeyPress(k.main)}
              >
                <Text style={styles.keyMainText}>{k.main}</Text>
                {k.sub ? <Text style={styles.keySubText}>{k.sub}</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>

      {/* Action Row */}
      <View style={styles.actionsRow}>
        <TouchableOpacity 
          style={[styles.smallActionButton, styles.chatActionBtn]} 
          onPress={handleOpenChat}
          activeOpacity={0.7}
        >
          <Text style={styles.smallActionIcon}>💬</Text>
          <Text style={styles.smallActionLabel}>Chat</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.callButton} 
          onPress={handleCall}
          activeOpacity={0.8}
        >
          <Text style={styles.callButtonIcon}>📞</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.smallActionButton, styles.backspaceBtn]} 
          onPress={handleBackspace}
          onLongPress={handleClear}
          activeOpacity={0.7}
        >
          <Text style={styles.smallActionIcon}>⌫</Text>
          <Text style={styles.smallActionLabel}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* Save Contact Modal */}
      <Modal visible={saveModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Save Contact</Text>
            <Text style={styles.modalSubtitle}>Virtual ID: {dialedNumber}</Text>
            
            <TextInput
              style={styles.modalInput}
              placeholder="Contact Name (e.g. Alex)"
              placeholderTextColor="#8E8E93"
              value={contactNameInput}
              onChangeText={setContactNameInput}
              autoFocus
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setSaveModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[styles.modalBtn, styles.confirmBtn]} 
                onPress={handleSaveContact}
              >
                <Text style={styles.confirmBtnText}>Save</Text>
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
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 24,
    backgroundColor: '#F8F9FA'
  },
  displayContainer: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  displaySubtitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#007AFF',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  displayInput: {
    fontSize: 38,
    fontWeight: '800',
    color: '#1C1C1E',
    letterSpacing: 3,
    textAlign: 'center',
  },
  hintText: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 6,
  },
  matchedBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    marginTop: 6,
  },
  matchedName: {
    color: '#007AFF',
    fontWeight: '700',
    fontSize: 15,
  },
  quickSaveLink: {
    marginTop: 6,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  quickSaveText: {
    color: '#34C759',
    fontWeight: '700',
    fontSize: 14,
  },
  keypadContainer: {
    marginVertical: 10,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  keyButton: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#EBF0F5',
  },
  keyMainText: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  keySubText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#8E8E93',
    marginTop: -2,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 8,
  },
  callButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#34C759',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#34C759',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  callButtonIcon: {
    fontSize: 30,
    color: '#FFF',
  },
  smallActionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    elevation: 2,
  },
  chatActionBtn: {
    backgroundColor: '#E5F1FF',
    borderColor: '#B0D5FF',
  },
  backspaceBtn: {
    backgroundColor: '#F0F0F5',
  },
  smallActionIcon: {
    fontSize: 20,
  },
  smallActionLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalInput: {
    backgroundColor: '#F0F0F5',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1C1C1E',
    marginBottom: 24,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
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
    fontSize: 16,
  },
  confirmBtn: {
    backgroundColor: '#007AFF',
  },
  confirmBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 16,
  },
});
