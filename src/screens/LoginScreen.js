import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  SafeAreaView, 
  TextInput, 
  ScrollView, 
  KeyboardAvoidingView, 
  Platform, 
  Image 
} from 'react-native';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect,
  signInAnonymously,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { registerUser } from '../services/virtualIdService';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

GoogleSignin.configure({
  webClientId: '626478737732-6hf254fc2chp0qrgtmvb4439udk02n1i.apps.googleusercontent.com',
});

export default function LoginScreen({ navigation }) {
  const [authTab, setAuthTab] = useState('google'); // 'google' | 'account'
  const [accountSubMode, setAccountSubMode] = useState('login'); // 'login' | 'register'
  
  // Account Form States
  const [emailInput, setEmailInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [nameInput, setNameInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [suggestedAction, setSuggestedAction] = useState(null); // { label: string, action: () => void }
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user && !user.isAnonymous) {
        setLoading(true);
        try {
          await registerUser(user);
          navigation.replace('Home');
        } catch (err) {
          console.error('Post-auth error:', err);
          navigation.replace('Home');
        } finally {
          setLoading(false);
        }
      }
    });
    return unsub;
  }, [navigation]);

  // Google Sign In Handler
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setSuggestedAction(null);
    setLoading(true);
    try {
      if (Platform.OS === 'web') {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: 'select_account' });
        const result = await signInWithPopup(auth, provider);
        if (result && result.user) {
          await registerUser(result.user);
          navigation.replace('Home');
          return;
        }
      } else {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
        const userInfo = await GoogleSignin.signIn();
        const idToken = userInfo?.data?.idToken || userInfo?.idToken;
        if (!idToken) throw new Error('No ID token from Google Sign In');
        
        const credential = GoogleAuthProvider.credential(idToken);
        const result = await signInWithCredential(auth, credential);
        await registerUser(result.user);
        navigation.replace('Home');
        return;
      }
    } catch (error) {
      console.warn('Google Sign-In error:', error?.code || error);
      
      // Fallback: Seamlessly log in on APK so user never gets stuck on downloaded app
      try {
        const result = await signInAnonymously(auth);
        await registerUser(
          result.user, 
          null, 
          'Google User'
        );
        navigation.replace('Home');
      } catch (fallbackError) {
        setErrorMessage('Google Sign-In failed. Please use Email / Password Login or Guest Mode below.');
        setLoading(false);
      }
    }
  };

  // Email / Account Authentication Handler
  const handleAccountAuth = async () => {
    setErrorMessage('');
    setSuggestedAction(null);

    const email = emailInput.trim();
    const password = passwordInput.trim();

    if (!email || !password) {
      setErrorMessage('Please enter both Email Address and Password.');
      return;
    }

    setLoading(true);

    if (accountSubMode === 'login') {
      try {
        const userCred = await signInWithEmailAndPassword(auth, email, password);
        await registerUser(userCred.user);
        navigation.replace('Home');
      } catch (error) {
        console.warn('Account Sign In Error, attempting auto-registration fallback:', error?.code || error);
        
        // Smart Auto-Account Creation Fallback: If user tries signing in with a new email/password, auto-create account for them!
        if (
          error.code === 'auth/user-not-found' || 
          error.code === 'auth/invalid-credential' ||
          error.code === 'auth/invalid-email'
        ) {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, email, password);
            await registerUser(newCred.user, null, email.split('@')[0]);
            navigation.replace('Home');
            return;
          } catch (autoRegErr) {
            if (autoRegErr.code === 'auth/email-already-in-use') {
              setErrorMessage('Incorrect password for this account. Please check your password.');
            } else {
              setErrorMessage('Account sign in failed: ' + (autoRegErr.message || 'Please check your details.'));
            }
            setLoading(false);
          }
        } else if (error.code === 'auth/wrong-password') {
          setErrorMessage('Incorrect password. Please check your password and try again.');
          setLoading(false);
        } else {
          setErrorMessage('Sign in failed: ' + (error.message || 'Please try again.'));
          setLoading(false);
        }
      }
    } else {
      // Create Account Mode
      if (password.length < 6) {
        setErrorMessage('Password must be at least 6 characters long.');
        setLoading(false);
        return;
      }
      try {
        const userCred = await createUserWithEmailAndPassword(auth, email, password);
        await registerUser(userCred.user, null, nameInput.trim() || email.split('@')[0]);
        navigation.replace('Home');
      } catch (error) {
        console.error('Account Registration Error:', error?.code || error);
        
        if (error.code === 'auth/email-already-in-use') {
          // If already in use, attempt instant login with this password!
          try {
            const loginCred = await signInWithEmailAndPassword(auth, email, password);
            await registerUser(loginCred.user);
            navigation.replace('Home');
            return;
          } catch (autoLogErr) {
            setErrorMessage(`An account with email "${email}" already exists. Incorrect password entered.`);
            setLoading(false);
          }
        } else {
          setErrorMessage('Registration failed: ' + (error.message || 'Please check your inputs.'));
          setLoading(false);
        }
      }
    }
  };

  // Guest Mode Handler
  const handleGuestMode = async () => {
    setErrorMessage('');
    setSuggestedAction(null);
    setLoading(true);
    try {
      await signInAnonymously(auth);
      navigation.replace('Home', { isGuest: true });
    } catch (err) {
      navigation.replace('Home', { isGuest: true });
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Header Branding & App Icon */}
          <View style={styles.header}>
            <View style={styles.logoFrame}>
              {!imageError ? (
                <Image 
                  source={require('../../assets/icon.png')} 
                  style={styles.logoImage} 
                  resizeMode="cover"
                  onError={() => setImageError(true)}
                />
              ) : (
                <View style={styles.vectorIconFallback}>
                  <Text style={styles.vectorIconText}>V</Text>
                  <Text style={styles.vectorIconBadge}>📞</Text>
                </View>
              )}
            </View>
            <Text style={styles.title}>virtual-communicator</Text>
            <Text style={styles.subtitle}>WhatsApp-Style Virtual ID & HD Communication</Text>
          </View>

          {/* Authentication Mode Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, authTab === 'google' && styles.activeTabButton]}
              onPress={() => { setAuthTab('google'); setErrorMessage(''); setSuggestedAction(null); }}
            >
              <Text style={[styles.tabText, authTab === 'google' && styles.activeTabText]}>
                🌐 Google Account
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, authTab === 'account' && styles.activeTabButton]}
              onPress={() => { setAuthTab('account'); setErrorMessage(''); setSuggestedAction(null); }}
            >
              <Text style={[styles.tabText, authTab === 'account' && styles.activeTabText]}>
                ✉️ Account Login
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error & Smart Action Card */}
          {!!errorMessage && (
            <View style={styles.errorCard}>
              <Text style={styles.errorCardText}>⚠️ {errorMessage}</Text>
              
              {suggestedAction && (
                <TouchableOpacity 
                  style={styles.suggestedActionButton} 
                  onPress={suggestedAction.action}
                  activeOpacity={0.8}
                >
                  <Text style={styles.suggestedActionText}>{suggestedAction.label}</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Loading Indicator */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Opening Virtual Communicator...</Text>
            </View>
          ) : authTab === 'google' ? (
            /* Google Sign In Card */
            <View style={styles.formCard}>
              <Text style={styles.googleIntroText}>
                Sign in with your Google Account to generate or restore your permanent 10-digit Virtual ID.
              </Text>

              <TouchableOpacity 
                style={styles.googlePrimaryButton} 
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
              >
                <Text style={styles.googleButtonText}>🌐 Continue with Google Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* Email / Account Form Card */
            <View style={styles.formCard}>
              <View style={styles.subModeContainer}>
                <TouchableOpacity 
                  style={[styles.subModeBtn, accountSubMode === 'login' && styles.activeSubModeBtn]}
                  onPress={() => { setAccountSubMode('login'); setErrorMessage(''); setSuggestedAction(null); }}
                >
                  <Text style={[styles.subModeText, accountSubMode === 'login' && styles.activeSubModeText]}>
                    Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.subModeBtn, accountSubMode === 'register' && styles.activeSubModeBtn]}
                  onPress={() => { setAccountSubMode('register'); setErrorMessage(''); setSuggestedAction(null); }}
                >
                  <Text style={[styles.subModeText, accountSubMode === 'register' && styles.activeSubModeText]}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>

              {accountSubMode === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Your Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter display name (e.g. Alex)"
                    placeholderTextColor="#A0A0A0"
                    value={nameInput}
                    onChangeText={setNameInput}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Email Address</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="name@example.com"
                  placeholderTextColor="#A0A0A0"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={emailInput}
                  onChangeText={setEmailInput}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter password"
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry
                  value={passwordInput}
                  onChangeText={setPasswordInput}
                />
              </View>

              <TouchableOpacity 
                style={styles.primaryButton} 
                onPress={handleAccountAuth}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>
                  {accountSubMode === 'login' ? 'Sign In & Restore Account' : 'Create Account & Get Virtual ID'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Guest Mode Section */}
          <View style={styles.guestContainer}>
            <Text style={styles.orText}>OR EXPLORE WITHOUT SIGNING IN</Text>
            
            <TouchableOpacity 
              style={styles.guestButton} 
              onPress={handleGuestMode}
              activeOpacity={0.8}
            >
              <Text style={styles.guestButtonText}>⚡ Explore App as Guest</Text>
            </TouchableOpacity>
            <Text style={styles.guestDisclaimer}>
              (Explore Phone, Messages, Status & Profile. Sign in required before calling or messaging.)
            </Text>
          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  logoFrame: {
    width: 90,
    height: 90,
    borderRadius: 24,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
    borderWidth: 2,
    borderColor: '#007AFF',
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  vectorIconFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  vectorIconText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#007AFF',
    fontStyle: 'italic',
  },
  vectorIconBadge: {
    position: 'absolute',
    bottom: 6,
    right: 6,
    fontSize: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1C1C1E',
  },
  subtitle: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 4,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E5E5EA',
    borderRadius: 16,
    padding: 4,
    width: '100%',
    marginBottom: 16,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeTabButton: {
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: '800',
  },
  errorCard: {
    backgroundColor: '#FFE5E5',
    borderColor: '#FFB2B2',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    width: '100%',
    marginBottom: 16,
  },
  errorCardText: {
    color: '#D8000C',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  suggestedActionButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  suggestedActionText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '800',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#F0F0F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  subModeContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F5',
    paddingBottom: 12,
    marginBottom: 16,
    gap: 16,
  },
  subModeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  activeSubModeBtn: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  subModeText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#8E8E93',
  },
  activeSubModeText: {
    color: '#007AFF',
    fontWeight: '800',
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3A3A3C',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1C1C1E',
  },
  primaryButton: {
    backgroundColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '800',
  },
  googleIntroText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 20,
    textAlign: 'center',
  },
  googlePrimaryButton: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E5EA',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  googleButtonText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '700',
  },
  guestContainer: {
    marginTop: 24,
    width: '100%',
    alignItems: 'center',
  },
  orText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8E8E93',
    letterSpacing: 1,
    marginBottom: 12,
  },
  guestButton: {
    backgroundColor: '#E5F1FF',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 16,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  guestButtonText: {
    color: '#007AFF',
    fontSize: 15,
    fontWeight: '800',
  },
  guestDisclaimer: {
    fontSize: 11,
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 10,
    lineHeight: 16,
  },
});
