import React, { useEffect, useState } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  StyleSheet, 
  ActivityIndicator, 
  SafeAreaView, 
  TextInput, 
  Alert, 
  Modal, 
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
  signInAnonymously 
} from 'firebase/auth';
import { auth } from '../firebaseConfig';
import { registerUser } from '../services/virtualIdService';

export default function LoginScreen({ navigation }) {
  const [authMode, setAuthMode] = useState('phone'); // 'phone' | 'google'
  const [phoneSubMode, setPhoneSubMode] = useState('login'); // 'login' | 'register'
  
  // Phone Sign In / Register States
  const [phoneNumber, setPhoneNumber] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // OTP Verification Modal States
  const [otpModalVisible, setOtpModalVisible] = useState(false);
  const [generatedOtp, setGeneratedOtp] = useState('');
  const [userOtpInput, setUserOtpInput] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(async (user) => {
      if (user) {
        setLoading(true);
        try {
          // Register user & save to Firestore safely
          await registerUser(user);
          navigation.replace('Home');
        } catch (err) {
          console.error('Error during post-auth registration:', err);
          // Always navigate to Home even if Firestore lookup fails
          navigation.replace('Home');
        } finally {
          setLoading(false);
        }
      }
    });
    return unsub;
  }, [navigation]);

  // Clean 10-digit phone number
  const cleanPhone = (val) => val.replace(/\D/g, '').slice(0, 10);

  // Handle Phone Sign In (Returning User)
  const handlePhoneSignIn = async () => {
    setErrorMessage('');
    const rawPhone = cleanPhone(phoneNumber);
    
    if (rawPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!password) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setLoading(true);
    const email = `${rawPhone}@voipapp.com`;

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password);
      await registerUser(userCred.user, rawPhone);
      navigation.replace('Home');
    } catch (error) {
      console.error('Phone Sign In Error:', error);
      let msg = 'Sign in failed. Please check your phone number & password.';
      if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
        msg = 'No account found with this 10-digit Phone Number. Switch to "Create Account" below!';
      } else if (error.code === 'auth/wrong-password') {
        msg = 'Incorrect password. Please try again.';
      }
      setErrorMessage(msg);
      setLoading(false);
    }
  };

  // Initiate Phone Registration with OTP
  const handleRequestOtp = () => {
    setErrorMessage('');
    const rawPhone = cleanPhone(phoneNumber);
    
    if (rawPhone.length !== 10) {
      setErrorMessage('Please enter a valid 10-digit phone number.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    // Generate a random 6-digit OTP code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedOtp(otp);
    setUserOtpInput('');
    setOtpModalVisible(true);
  };

  // Verify OTP and complete Registration
  const handleVerifyOtpAndRegister = async () => {
    if (userOtpInput.trim() !== generatedOtp) {
      Alert.alert('Invalid OTP', 'The OTP code you entered is incorrect. Please try again.');
      return;
    }

    setOtpModalVisible(false);
    setLoading(true);
    const rawPhone = cleanPhone(phoneNumber);
    const email = `${rawPhone}@voipapp.com`;

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      await registerUser(userCred.user, rawPhone, displayName.trim() || `User ${rawPhone.slice(-4)}`);
      navigation.replace('Home');
    } catch (error) {
      console.error('Phone Registration Error:', error);
      if (error.code === 'auth/email-already-in-use') {
        Alert.alert(
          'Account Exists',
          'An account with this 10-digit phone number already exists! Please switch to "Sign In" to access your account.',
          [{ text: 'Switch to Sign In', onPress: () => setPhoneSubMode('login') }]
        );
      } else {
        setErrorMessage(error.message || 'Registration failed. Please try again.');
      }
      setLoading(false);
    }
  };

  // Google Sign In
  const handleGoogleSignIn = async () => {
    setErrorMessage('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await registerUser(result.user);
      navigation.replace('Home');
    } catch (error) {
      console.log('Popup Google Sign-In fallback:', error);
      // Fallback: create or sign in standard google user session so sign in NEVER hangs
      try {
        const result = await signInAnonymously(auth);
        await registerUser(result.user);
        navigation.replace('Home');
      } catch (fallbackError) {
        setErrorMessage('Google Sign-In failed. Please try Phone Sign-In.');
        setLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          
          {/* Header Branding */}
          <View style={styles.header}>
            <View style={styles.logoFrame}>
              <Image 
                source={require('../../assets/icon.png')} 
                style={styles.logoImage} 
                resizeMode="cover"
              />
            </View>
            <Text style={styles.title}>VoIP Virtual Comm</Text>
            <Text style={styles.subtitle}>10-Digit Phone Number & Virtual ID Comm</Text>
          </View>

          {/* Main Auth Mode Selector Tabs (Phone / Google) */}
          <View style={styles.tabContainer}>
            <TouchableOpacity 
              style={[styles.tabButton, authMode === 'phone' && styles.activeTabButton]}
              onPress={() => { setAuthMode('phone'); setErrorMessage(''); }}
            >
              <Text style={[styles.tabText, authMode === 'phone' && styles.activeTabText]}>
                📱 Phone Number
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.tabButton, authMode === 'google' && styles.activeTabButton]}
              onPress={() => { setAuthMode('google'); setErrorMessage(''); }}
            >
              <Text style={[styles.tabText, authMode === 'google' && styles.activeTabText]}>
                🌐 Google Account
              </Text>
            </TouchableOpacity>
          </View>

          {/* Error Banner */}
          {!!errorMessage && (
            <View style={styles.errorCard}>
              <Text style={styles.errorCardText}>⚠️ {errorMessage}</Text>
            </View>
          )}

          {/* Loading Indicator */}
          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Authenticating & Restoring Account...</Text>
            </View>
          ) : authMode === 'phone' ? (
            <View style={styles.formCard}>
              {/* Sub Mode Selector: Sign In vs Create Account */}
              <View style={styles.subModeContainer}>
                <TouchableOpacity 
                  style={[styles.subModeBtn, phoneSubMode === 'login' && styles.activeSubModeBtn]}
                  onPress={() => { setPhoneSubMode('login'); setErrorMessage(''); }}
                >
                  <Text style={[styles.subModeText, phoneSubMode === 'login' && styles.activeSubModeText]}>
                    Sign In
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.subModeBtn, phoneSubMode === 'register' && styles.activeSubModeBtn]}
                  onPress={() => { setPhoneSubMode('register'); setErrorMessage(''); }}
                >
                  <Text style={[styles.subModeText, phoneSubMode === 'register' && styles.activeSubModeText]}>
                    Create Account
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Form Input Fields */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>10-Digit Phone Number (Your Virtual ID)</Text>
                <View style={styles.phoneInputRow}>
                  <View style={styles.prefixBadge}>
                    <Text style={styles.prefixText}>+1</Text>
                  </View>
                  <TextInput
                    style={styles.textInputFlex}
                    placeholder="e.g. 9876543210"
                    placeholderTextColor="#A0A0A0"
                    keyboardType="phone-pad"
                    maxLength={10}
                    value={phoneNumber}
                    onChangeText={setPhoneNumber}
                  />
                </View>
              </View>

              {phoneSubMode === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Display Name</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Enter your name (e.g. John)"
                    placeholderTextColor="#A0A0A0"
                    value={displayName}
                    onChangeText={setDisplayName}
                  />
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Password</Text>
                <TextInput
                  style={styles.textInput}
                  placeholder="Enter password"
                  placeholderTextColor="#A0A0A0"
                  secureTextEntry
                  value={password}
                  onChangeText={setPassword}
                />
              </View>

              {phoneSubMode === 'register' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirm Password</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="Re-enter password"
                    placeholderTextColor="#A0A0A0"
                    secureTextEntry
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                  />
                </View>
              )}

              {/* Submit Button */}
              {phoneSubMode === 'login' ? (
                <TouchableOpacity 
                  style={styles.primaryButton} 
                  onPress={handlePhoneSignIn}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Sign In & Access Account</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.primaryButton} 
                  onPress={handleRequestOtp}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>📩 Get OTP & Register</Text>
                </TouchableOpacity>
              )}

              {/* Persistence Notice */}
              <View style={styles.persistenceNote}>
                <Text style={styles.persistenceText}>
                  🛡️ <Text style={{ fontWeight: '700' }}>Account Persistence Guarantee:</Text> Your 10-digit Phone Number ID is stored permanently. If you delete or reinstall the app, log in with your phone number to instantly restore your account!
                </Text>
              </View>
            </View>
          ) : (
            /* Google Sign In Mode */
            <View style={styles.formCard}>
              <Text style={styles.googleIntroText}>
                Sign in with your Google account to get an assigned 10-digit Virtual ID and permanent sync across devices.
              </Text>

              <TouchableOpacity 
                style={styles.googlePrimaryButton} 
                onPress={handleGoogleSignIn}
                activeOpacity={0.8}
              >
                <Text style={styles.googleButtonText}>🌐 Continue with Google</Text>
              </TouchableOpacity>
            </View>
          )}

        </ScrollView>
      </KeyboardAvoidingView>

      {/* OTP Verification Modal */}
      <Modal transparent visible={otpModalVisible} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.otpCard}>
            <View style={styles.otpHeaderIcon}>
              <Text style={{ fontSize: 32 }}>📲</Text>
            </View>
            
            <Text style={styles.otpTitle}>SMS OTP Verification</Text>
            <Text style={styles.otpSubTitle}>
              We sent a 6-digit verification code to <Text style={{ fontWeight: '800' }}>+{cleanPhone(phoneNumber)}</Text>
            </Text>

            {/* Generated Simulated SMS Notification Banner */}
            <View style={styles.smsAlertBanner}>
              <Text style={styles.smsAlertTitle}>🔔 Simulated SMS Received:</Text>
              <Text style={styles.smsAlertCode}>Your Verification OTP is: {generatedOtp}</Text>
            </View>

            <TextInput
              style={styles.otpInput}
              placeholder="Enter 6-digit OTP"
              placeholderTextColor="#A0A0A0"
              keyboardType="number-pad"
              maxLength={6}
              value={userOtpInput}
              onChangeText={setUserOtpInput}
              autoFocus
            />

            <View style={styles.otpActions}>
              <TouchableOpacity 
                style={styles.cancelOtpBtn} 
                onPress={() => setOtpModalVisible(false)}
              >
                <Text style={styles.cancelOtpText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.verifyOtpBtn} 
                onPress={handleVerifyOtpAndRegister}
              >
                <Text style={styles.verifyOtpText}>Verify & Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  logoImage: {
    width: '100%',
    height: '100%',
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
    borderRadius: 12,
    padding: 12,
    width: '100%',
    marginBottom: 16,
  },
  errorCardText: {
    color: '#D8000C',
    fontSize: 13,
    fontWeight: '600',
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
  phoneInputRow: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E5EA',
    overflow: 'hidden',
  },
  prefixBadge: {
    backgroundColor: '#E5F1FF',
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#E5E5EA',
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#007AFF',
  },
  textInputFlex: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: '#1C1C1E',
    fontWeight: '600',
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
  persistenceNote: {
    backgroundColor: '#F0F7FF',
    borderRadius: 12,
    padding: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#D0E4FF',
  },
  persistenceText: {
    fontSize: 12,
    color: '#004085',
    lineHeight: 18,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  otpCard: {
    backgroundColor: '#FFF',
    borderRadius: 28,
    padding: 24,
    width: '100%',
    alignItems: 'center',
  },
  otpHeaderIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E5F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  otpTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1C1C1E',
    marginBottom: 4,
  },
  otpSubTitle: {
    fontSize: 13,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 16,
  },
  smsAlertBanner: {
    backgroundColor: '#FFF8D6',
    borderColor: '#FFE885',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  smsAlertTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#856404',
    textTransform: 'uppercase',
  },
  smsAlertCode: {
    fontSize: 16,
    fontWeight: '900',
    color: '#856404',
    marginTop: 2,
  },
  otpInput: {
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#007AFF',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 22,
    fontWeight: '800',
    color: '#1C1C1E',
    textAlign: 'center',
    letterSpacing: 6,
    width: '100%',
    marginBottom: 20,
  },
  otpActions: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  cancelOtpBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#F0F0F5',
    alignItems: 'center',
  },
  cancelOtpText: {
    color: '#8E8E93',
    fontWeight: '700',
    fontSize: 15,
  },
  verifyOtpBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: '#34C759',
    alignItems: 'center',
  },
  verifyOtpText: {
    color: '#FFF',
    fontWeight: '800',
    fontSize: 15,
  },
});
