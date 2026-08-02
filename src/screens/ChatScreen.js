import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, StyleSheet, KeyboardAvoidingView, Platform, SafeAreaView } from 'react-native';
import { db } from '../firebaseConfig';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, setDoc, doc } from 'firebase/firestore';

export default function ChatScreen({ route, navigation }) {
  const { chatId, contactId, currentId } = route.params;
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    navigation.setOptions({
      title: contactId,
      headerStyle: { backgroundColor: '#F8F9FA' },
      headerShadowVisible: false,
      headerTitleStyle: { fontWeight: '700' },
      headerRight: () => (
        <TouchableOpacity 
          style={styles.callButton}
          onPress={() => navigation.navigate('Call', { contactId, currentId, isCaller: true })}
        >
          <Text style={styles.callButtonText}>Call</Text>
        </TouchableOpacity>
      )
    });

    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    
    const unsub = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return unsub;
  }, [navigation, chatId, contactId]);

  const sendMessage = async () => {
    if (!text.trim()) return;
    const messageText = text;
    setText('');
    
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    await addDoc(messagesRef, {
      senderVirtualId: currentId,
      recipientVirtualId: contactId,
      text: messageText,
      timestamp: serverTimestamp()
    });

    // Update last message
    await setDoc(doc(db, 'chats', chatId), {
      participants: [currentId, contactId],
      lastMessage: messageText,
      lastUpdated: serverTimestamp()
    }, { merge: true });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.keyboardView} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}>
        <FlatList
          ref={flatListRef}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          data={messages}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
          renderItem={({ item }) => {
            const isMe = item.senderVirtualId === currentId;
            return (
              <View style={[styles.messageWrapper, isMe ? styles.myMessageWrapper : styles.theirMessageWrapper]}>
                <View style={[styles.messageBubble, isMe ? styles.myMessage : styles.theirMessage]}>
                  <Text style={[styles.messageText, isMe ? styles.myMessageText : styles.theirMessageText]}>{item.text}</Text>
                </View>
                {item.timestamp && (
                   <Text style={[styles.timestamp, isMe ? styles.myTimestamp : styles.theirTimestamp]}>
                     {formatTime(item.timestamp)}
                   </Text>
                )}
              </View>
            );
          }}
        />
        <View style={styles.inputContainer}>
          <TextInput 
            style={styles.input} 
            value={text}
            onChangeText={setText}
            placeholder="Type a message..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity 
            style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]} 
            onPress={sendMessage}
            disabled={!text.trim()}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  keyboardView: { flex: 1 },
  callButton: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callButtonText: { color: '#007AFF', fontWeight: '700', fontSize: 15 },
  listContainer: { padding: 16, paddingBottom: 24 },
  messageWrapper: { marginBottom: 16, maxWidth: '80%' },
  myMessageWrapper: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  theirMessageWrapper: { alignSelf: 'flex-start', alignItems: 'flex-start' },
  messageBubble: { padding: 14, borderRadius: 20 },
  myMessage: { 
    backgroundColor: '#007AFF',
    borderBottomRightRadius: 4,
  },
  theirMessage: { 
    backgroundColor: '#FFF',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E5EA'
  },
  messageText: { fontSize: 16, lineHeight: 22 },
  myMessageText: { color: '#FFF' },
  theirMessageText: { color: '#1C1C1E' },
  timestamp: { fontSize: 11, color: '#8E8E93', marginTop: 4, marginHorizontal: 4 },
  inputContainer: { 
    flexDirection: 'row', 
    padding: 16, 
    paddingBottom: Platform.OS === 'ios' ? 16 : 24,
    backgroundColor: '#FFF',
    borderTopWidth: 1,
    borderColor: '#E5E5EA',
    alignItems: 'flex-end'
  },
  input: { 
    flex: 1, 
    backgroundColor: '#F0F0F5', 
    borderRadius: 24, 
    paddingHorizontal: 20, 
    paddingTop: 12,
    paddingBottom: 12,
    marginRight: 12,
    fontSize: 16,
    maxHeight: 120,
    color: '#1C1C1E'
  },
  sendButton: {
    backgroundColor: '#007AFF',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2
  },
  sendButtonDisabled: {
    backgroundColor: '#B4D6FF'
  },
  sendButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 }
});
