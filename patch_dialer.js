const fs = require('fs');
let code = fs.readFileSync('src/components/DialerTab.js', 'utf8');

if (!code.includes('const [dialerMode, setDialerMode]')) {
    code = code.replace(
        'const [dialedNumber, setDialedNumber] = useState(\'\');',
        'const [dialerMode, setDialerMode] = useState(\'keypad\'); // \'keypad\' or \'recent\'\n  const [dialedNumber, setDialedNumber] = useState(\'\');'
    );
}

if (!code.includes('import CallHistoryTab')) {
    code = code.replace(
        'import { saveContact } from \'../services/contactService\';',
        'import { saveContact } from \'../services/contactService\';\nimport CallHistoryTab from \'./CallHistoryTab\';'
    );
}

const toggleJSX = `
      {/* Segmented Control */}
      <View style={{flexDirection: 'row', backgroundColor: '#E5E5EA', borderRadius: 8, padding: 4, marginBottom: 10}}>
        <TouchableOpacity style={{flex: 1, padding: 8, borderRadius: 6, backgroundColor: dialerMode === 'keypad' ? '#FFF' : 'transparent', alignItems: 'center', shadowColor: dialerMode === 'keypad' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1}}} onPress={() => setDialerMode('keypad')}>
            <Text style={{fontWeight: dialerMode === 'keypad' ? 'bold' : 'normal'}}>Keypad</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{flex: 1, padding: 8, borderRadius: 6, backgroundColor: dialerMode === 'recent' ? '#FFF' : 'transparent', alignItems: 'center', shadowColor: dialerMode === 'recent' ? '#000' : 'transparent', shadowOpacity: 0.1, shadowRadius: 2, shadowOffset: {width: 0, height: 1}}} onPress={() => setDialerMode('recent')}>
            <Text style={{fontWeight: dialerMode === 'recent' ? 'bold' : 'normal'}}>Recent</Text>
        </TouchableOpacity>
      </View>
`;

code = code.replace(
    '<View style={styles.container}>\n      {/* Top Display Area */}',
    '<View style={styles.container}>\n' + toggleJSX + '\n      {dialerMode === \'recent\' ? (\n        <CallHistoryTab currentUserData={currentUserData} savedContacts={savedContacts} navigation={navigation} />\n      ) : (\n      <>\n      {/* Top Display Area */}'
);

code = code.replace(
    '      {/* Save Contact Modal */}',
    '      </>\n      )}\n      {/* Save Contact Modal */}'
);

fs.writeFileSync('src/components/DialerTab.js', code);
