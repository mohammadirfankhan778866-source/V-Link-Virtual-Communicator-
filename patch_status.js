const fs = require('fs');
let code = fs.readFileSync('src/components/StatusTab.js', 'utf8');

const fabJSX = `
      {/* Floating Action Button for Status */}
      <TouchableOpacity 
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: '#007AFF',
          width: 56,
          height: 56,
          borderRadius: 28,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 4,
          elevation: 5
        }}
        onPress={handleOpenEditStatus}
        activeOpacity={0.8}
      >
        <Text style={{color: '#FFF', fontSize: 24, fontWeight: 'bold'}}>+</Text>
      </TouchableOpacity>
`;

code = code.replace(
    /\{\/\* Edit Status Modal \*\/\}/g,
    fabJSX + '\n      {/* Edit Status Modal */}'
);

fs.writeFileSync('src/components/StatusTab.js', code);
