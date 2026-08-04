import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';

export default function CallHistoryTab({ currentUserData, savedContacts, navigation }) {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserData?.virtualId) return;

    const callsRef = collection(db, 'calls');
    // Fetch calls where current user is caller or receiver
    const unsub = onSnapshot(callsRef, (snapshot) => {
      const myVirtualId = currentUserData.virtualId;
      const list = [];
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.callerVirtualId === myVirtualId || data.receiverVirtualId === myVirtualId) {
          list.push({ id: doc.id, ...data });
        }
      });

      // Sort newest first
      list.sort((a, b) => {
        const tA = a.timestamp?.toMillis ? a.timestamp.toMillis() : 0;
        const tB = b.timestamp?.toMillis ? b.timestamp.toMillis() : 0;
        return tB - tA;
      });

      setCalls(list);
      setLoading(false);
    }, (err) => {
      console.log('Call history snapshot error:', err);
      setLoading(false);
    });

    return unsub;
  }, [currentUserData]);

  const getContactName = (virtualId) => {
    const found = savedContacts.find(c => c.virtualId === virtualId);
    return found ? found.name : `Virtual ID: ${virtualId}`;
  };

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'Recent';
    const date = timestamp.toDate ? timestamp.toDate() : new Date();
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return `${date.getMonth() + 1}/${date.getDate()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  const getInitials = (str) => {
    if (!str) return '?';
    const clean = str.replace('Virtual ID: ', '');
    return clean.substring(0, 2).toUpperCase();
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>📞</Text>
              <Text style={styles.emptyTitle}>No Call History</Text>
              <Text style={styles.emptySubtext}>
                Your recent VoIP calls and missed calls will show up here.
              </Text>
            </View>
          )}
          renderItem={({ item }) => {
            const isOutgoing = item.callerVirtualId === currentUserData?.virtualId;
            const otherPartyId = isOutgoing ? item.receiverVirtualId : item.callerVirtualId;
            const displayName = getContactName(otherPartyId);
            const isMissed = !isOutgoing && (item.status === 'REJECTED' || item.status === 'OFFERING');

            return (
              <View style={styles.historyCard}>
                <View style={[styles.avatarCircle, isMissed && styles.missedAvatarBg]}>
                  <Text style={[styles.avatarText, isMissed && styles.missedAvatarText]}>
                    {getInitials(displayName)}
                  </Text>
                </View>

                <View style={styles.infoContainer}>
                  <Text style={[styles.contactName, isMissed && styles.missedName]} numberOfLines={1}>
                    {displayName}
                  </Text>
                  
                  <View style={styles.statusRow}>
                    <Text style={styles.directionIcon}>
                      {isOutgoing ? '↗' : '↙'}
                    </Text>
                    <Text style={[styles.statusText, isMissed && styles.missedStatusText]}>
                      {isOutgoing 
                        ? (item.status === 'ENDED' ? 'Outgoing Call' : item.status === 'REJECTED' ? 'Declined' : 'Outgoing')
                        : (isMissed ? 'Missed Call' : 'Incoming Call')}
                    </Text>
                    <Text style={styles.dotSeparator}>•</Text>
                    <Text style={styles.timeText}>{formatTimestamp(item.timestamp)}</Text>
                  </View>
                </View>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.chatBtn]}
                    onPress={() => {
                      const chatId = [currentUserData?.virtualId, otherPartyId].sort().join('_');
                      navigation.navigate('Chat', { chatId, contactId: otherPartyId, currentId: currentUserData?.virtualId });
                    }}
                  >
                    <Text style={styles.actionBtnIcon}>💬</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionBtn, styles.callBtn]}
                    onPress={() => {
                      navigation.navigate('Call', { contactId: otherPartyId, currentId: currentUserData?.virtualId, isCaller: true });
                    }}
                  >
                    <Text style={styles.actionBtnIcon}>📞</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  historyCard: {
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
  missedAvatarBg: {
    backgroundColor: '#FFE5E5',
  },
  missedAvatarText: {
    color: '#FF3B30',
  },
  infoContainer: {
    flex: 1,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  missedName: {
    color: '#FF3B30',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  directionIcon: {
    fontSize: 14,
    marginRight: 4,
    fontWeight: 'bold',
  },
  statusText: {
    fontSize: 13,
    color: '#8E8E93',
    fontWeight: '500',
  },
  missedStatusText: {
    color: '#FF3B30',
    fontWeight: '600',
  },
  dotSeparator: {
    fontSize: 12,
    color: '#C7C7CC',
    marginHorizontal: 6,
  },
  timeText: {
    fontSize: 12,
    color: '#8E8E93',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatBtn: {
    backgroundColor: '#E5F1FF',
  },
  callBtn: {
    backgroundColor: '#E1F9E6',
  },
  actionBtnIcon: {
    fontSize: 16,
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 60,
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
  },
});
