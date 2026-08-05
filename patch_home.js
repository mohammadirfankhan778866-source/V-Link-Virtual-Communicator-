const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.js', 'utf8');

if (!code.includes('const [settingsModalVisible, setSettingsModalVisible]')) {
    code = code.replace(
        'const [authRequiredModal, setAuthRequiredModal] = useState({ visible: false, actionName: \'\' });',
        'const [authRequiredModal, setAuthRequiredModal] = useState({ visible: false, actionName: \'\' });\n  const [settingsModalVisible, setSettingsModalVisible] = useState(false);\n  const [menuVisible, setMenuVisible] = useState(false);'
    );
}

if (!code.includes('import { BlurView }')) {
    code = code.replace(
        'import {',
        'import { BlurView } from \'expo-blur\';\nimport {'
    );
}

code = code.replace(
    /<View style=\{\[styles\.idBadge, isGuest && styles\.guestBadge\]\}>[\s\S]*?<\/Text>\s*<\/View>/,
    `<View style={[styles.idBadge, isGuest && styles.guestBadge]}>
            <Text style={[styles.idBadgeText, isGuest && styles.guestBadgeText]}>
              {isGuest ? '⚡ Guest Mode' : \`ID: \${currentUserData?.virtualId || '...'}\`}
            </Text>
          </View>
          
          <TouchableOpacity onPress={() => setMenuVisible(!menuVisible)} style={{marginLeft: 10, padding: 5}}>
            <Text style={{fontSize: 20, fontWeight: 'bold', color: '#1C1C1E'}}>⋮</Text>
          </TouchableOpacity>`
);

// Add the modal for Settings
const settingsModalJSX = `
      {/* Settings Menu Popup */}
      {menuVisible && (
        <View style={{position: 'absolute', top: 50, right: 20, backgroundColor: '#FFF', borderRadius: 8, padding: 10, shadowColor: '#000', shadowOffset: {width: 0, height: 2}, shadowOpacity: 0.1, elevation: 4, zIndex: 100}}>
          <TouchableOpacity style={{paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F5'}} onPress={() => {setMenuVisible(false); setSettingsModalVisible(true);}}>
            <Text style={{fontSize: 16, color: '#1C1C1E'}}>Settings</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F5'}} onPress={() => {setMenuVisible(false); Alert.alert('License', 'Virtual Communicator v1.0\\nMIT License');}}>
            <Text style={{fontSize: 16, color: '#1C1C1E'}}>License</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{paddingVertical: 10}} onPress={() => {setMenuVisible(false); Alert.alert('Privacy Policy', 'We value your privacy. Messages and calls are encrypted.');}}>
            <Text style={{fontSize: 16, color: '#1C1C1E'}}>Privacy Policy</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Settings Modal */}
      <Modal transparent animationType="slide" visible={settingsModalVisible}>
        <View style={styles.modalOverlay}>
          <View style={[styles.authRequiredCard, {width: '90%'}]}>
            <Text style={styles.authModalTitle}>App Settings</Text>
            <Text style={styles.authModalSubtitle}>Customize your Virtual Communicator</Text>
            
            <View style={{width: '100%', marginVertical: 15}}>
                <Text style={{fontSize: 16, fontWeight: '600', marginBottom: 10}}>App Theme</Text>
                <View style={{flexDirection: 'row', gap: 10}}>
                    <TouchableOpacity style={{flex: 1, padding: 10, backgroundColor: '#007AFF', borderRadius: 8, alignItems: 'center'}}><Text style={{color: '#FFF'}}>Light</Text></TouchableOpacity>
                    <TouchableOpacity style={{flex: 1, padding: 10, backgroundColor: '#333', borderRadius: 8, alignItems: 'center'}}><Text style={{color: '#FFF'}}>Dark</Text></TouchableOpacity>
                </View>
            </View>

            <TouchableOpacity 
              style={styles.cancelAuthBtn} 
              onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.cancelAuthText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
`;

code = code.replace(
    /\{authRequiredModal\.visible\}\s*>\s*<View style=\{styles\.modalOverlay\}>/g,
    `{authRequiredModal.visible}>
        <View style={styles.modalOverlay}>`
);

if (!code.includes('App Settings')) {
    code = code.replace('</View>\n  );\n}\n', settingsModalJSX + '\n    </View>\n  );\n}\n');
}

fs.writeFileSync('src/screens/HomeScreen.js', code);
