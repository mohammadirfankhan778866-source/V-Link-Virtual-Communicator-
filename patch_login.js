const fs = require('fs');
let code = fs.readFileSync('src/screens/LoginScreen.js', 'utf8');

code = code.replace(
  /<View style=\{styles\.logoCircle\}>\s*<Text style=\{styles\.logoText\}>VC<\/Text>\s*<\/View>/,
  '<Image source={require("../../assets/icon.png")} style={{width: 100, height: 100, borderRadius: 24, marginBottom: 20}} />'
);

if (!code.includes('import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image }')) {
  code = code.replace(
    'import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert } from \\\'react-native\\\';',
    'import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator, Alert, Image } from \\\'react-native\\\';'
  );
}

fs.writeFileSync('src/screens/LoginScreen.js', code);
