const fs = require('fs');
let code = fs.readFileSync('src/screens/HomeScreen.js', 'utf8');

const replacement = `      {/* Settings Modal */}
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
               style={[styles.cancelAuthBtn, {marginBottom: 10, backgroundColor: '#FF3B30'}]} 
               onPress={() => {
                   setSettingsModalVisible(false);
                   auth.signOut();
                   navigation.replace('Login');
               }}
            >
              <Text style={[styles.cancelAuthText, {color: '#FFF'}]}>Log Out</Text>
            </TouchableOpacity>

            <TouchableOpacity 
               style={styles.cancelAuthBtn} 
               onPress={() => setSettingsModalVisible(false)}
            >
              <Text style={styles.cancelAuthText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>`;

code = code.replace(
    /\{\/\* Settings Modal \*\/\}[\s\S]*?<\/Modal>/,
    replacement
);
fs.writeFileSync('src/screens/HomeScreen.js', code);
