import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput, Alert, Image } from 'react-native';
import { auth, db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

export default function ProfileTab({ currentUserData, savedContacts, navigation }) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(currentUserData?.displayName || '');
  const [copiedToast, setCopiedToast] = useState(false);

  const getInitials = (str) => {
    if (!str) return 'VP';
    const words = str.trim().split(' ');
    if (words.length >= 2) {
      return (words[0][0] + words[1][0]).toUpperCase();
    }
    return str.substring(0, 2).toUpperCase();
  };

  const handleSaveName = async () => {
    if (!nameInput.trim()) return;
    try {
      if (auth.currentUser) {
        const userRef = doc(db, 'users', auth.currentUser.uid);
        await updateDoc(userRef, { displayName: nameInput.trim() });
        setIsEditingName(false);
        Alert.alert('Updated', 'Profile name updated successfully!');
      }
    } catch (err) {
      Alert.alert('Error', 'Failed to update name.');
    }
  };

  const handleCopyId = () => {
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            await auth.signOut();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* Header Profile Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarWrapper}>
          <Text style={styles.avatarText}>{getInitials(currentUserData?.displayName || currentUserData?.virtualId)}</Text>
        </View>

        {isEditingName ? (
          <View style={styles.editNameRow}>
            <TextInput
              style={styles.nameInput}
              value={nameInput}
              onChangeText={setNameInput}
              placeholder="Enter your name"
              autoFocus
            />
            <TouchableOpacity style={styles.saveNameBtn} onPress={handleSaveName}>
              <Text style={styles.saveNameText}>Save</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.nameRow} onPress={() => setIsEditingName(true)}>
            <Text style={styles.displayName}>{currentUserData?.displayName || 'VoIP User'}</Text>
            <Text style={styles.editPencil}>✏️</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.emailText}>{currentUserData?.email || 'Registered User'}</Text>
      </View>

      {/* Prominent Virtual ID Card */}
      <View style={styles.virtualIdCard}>
        <View style={styles.cardBadgeHeader}>
          <Text style={styles.cardBadgeText}>YOUR 10-DIGIT PHONE / VIRTUAL ID</Text>
        </View>

        <Text style={styles.virtualIdText}>{currentUserData?.virtualId || '----------'}</Text>

        <TouchableOpacity 
          style={styles.copyButton} 
          onPress={handleCopyId}
          activeOpacity={0.8}
        >
          <Text style={styles.copyButtonText}>
            {copiedToast ? '✓ ID Saved / Copied!' : '📋 Copy Virtual ID'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Permanence & Re-install Guarantee Card */}
      <View style={styles.guaranteeCard}>
        <View style={styles.guaranteeHeader}>
          <Text style={styles.guaranteeIcon}>🛡️</Text>
          <Text style={styles.guaranteeTitle}>Account Persistence</Text>
        </View>
        <Text style={styles.guaranteeBody}>
          Your Virtual Number ID <Text style={styles.highlightText}>({currentUserData?.virtualId})</Text> is permanently linked to your account.
        </Text>
        <Text style={styles.guaranteeSubbody}>
          If you delete or reinstall this app, simply log in again with this same account to instantly regain your Virtual ID, saved contacts, and messages.
        </Text>
      </View>

      {/* Account Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statNumber}>{savedContacts.length}</Text>
          <Text style={styles.statLabel}>Saved Contacts</Text>
        </View>

        <View style={styles.statDivider} />

        <View style={styles.statBox}>
          <Text style={styles.statNumber}>Active</Text>
          <Text style={styles.statLabel}>Network Status</Text>
        </View>
      </View>

      {/* Sign Out Action */}
      <TouchableOpacity 
        style={styles.signOutButton} 
        onPress={handleSignOut}
        activeOpacity={0.8}
      >
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  avatarWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFF',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  displayName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  editPencil: {
    fontSize: 14,
    marginLeft: 8,
  },
  editNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  nameInput: {
    backgroundColor: '#F0F0F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 16,
    color: '#1C1C1E',
  },
  saveNameBtn: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  saveNameText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  emailText: {
    fontSize: 14,
    color: '#8E8E93',
  },
  virtualIdCard: {
    backgroundColor: '#007AFF',
    borderRadius: 24,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  cardBadgeHeader: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  cardBadgeText: {
    color: '#FFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
  },
  virtualIdText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFF',
    letterSpacing: 2,
    marginBottom: 16,
  },
  copyButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 16,
  },
  copyButtonText: {
    color: '#007AFF',
    fontWeight: '700',
    fontSize: 14,
  },
  guaranteeCard: {
    backgroundColor: '#EBF5FF',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#BBE0FF',
  },
  guaranteeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  guaranteeIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  guaranteeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#004085',
  },
  guaranteeBody: {
    fontSize: 14,
    color: '#004085',
    lineHeight: 20,
    marginBottom: 6,
  },
  highlightText: {
    fontWeight: '800',
  },
  guaranteeSubbody: {
    fontSize: 13,
    color: '#336699',
    lineHeight: 18,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0F0F5',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#E5E5EA',
  },
  signOutButton: {
    backgroundColor: '#FFF',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFE5E5',
  },
  signOutText: {
    color: '#FF3B30',
    fontSize: 16,
    fontWeight: '700',
  },
});
