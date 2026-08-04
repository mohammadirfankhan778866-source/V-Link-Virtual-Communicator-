import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, SafeAreaView, Dimensions, Image } from 'react-native';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential, signInAnonymously } from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { registerUser } from '../services/virtualIdService';

const { width } = Dimensions.get('window');

GoogleSignin.configure({
  webClientId: '626478737732-6hf254fc2chp0qrgtmvb4439udk02n1i.apps.googleusercontent.com',
});

export default function LoginScreen({ navigation }) {
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        await registerUser(user);
        navigation.replace('Home');
      }
    });
    return unsub;
  }, [navigation]);

  const signInWithGoogle = async () => {
    try {
      setLoading(true);
      await GoogleSignin.hasPlayServices();
      const { idToken } = await GoogleSignin.signIn();
      const credential = GoogleAuthProvider.credential(idToken);
      const userCred = await signInWithCredential(auth, credential);
      await registerUser(userCred.user);
      navigation.replace('Home');
    } catch (error) {
      console.log('Google Sign-In Note:', error.message);
      setLoading(false);
    }
  };

  const signInGuest = async () => {
    try {
      setLoading(true);
      const userCred = await signInAnonymously(auth);
      await registerUser(userCred.user);
      navigation.replace('Home');
    } catch (error) {
      console.error('Guest Sign-In Error:', error);
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Generated App Logo Display */}
        <View style={styles.logoFrame}>
          <Image 
            source={require('../../assets/icon.png')} 
            style={styles.logoImage} 
            resizeMode="cover"
          />
        </View>

        <Text style={styles.title}>VoIP Virtual Comm</Text>
        <Text style={styles.subtitle}>Permanent 7-Digit Virtual Number Calls & Messenger</Text>
        
        <View style={styles.infoBadge}>
          <Text style={styles.infoBadgeText}>🔒 Permanent Virtual Number ID linked to Account</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" style={styles.loader} />
        ) : (
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.googleButton} onPress={signInWithGoogle} activeOpacity={0.8}>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.guestButton} onPress={signInGuest} activeOpacity={0.8}>
              <Text style={styles.guestButtonText}>⚡ Quick Guest Login</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoFrame: {
    width: 110,
    height: 110,
    borderRadius: 28,
    overflow: 'hidden',
    marginBottom: 24,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 10,
    borderWidth: 2,
    borderColor: '#FFF',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 24,
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  infoBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#BBE0FF',
  },
  infoBadgeText: {
    color: '#007AFF',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  loader: {
    marginTop: 20,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  googleButton: {
    backgroundColor: '#FFF',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  googleButtonText: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '700',
  },
  guestButton: {
    backgroundColor: '#007AFF',
    width: '100%',
    paddingVertical: 16,
    borderRadius: 18,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  guestButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
