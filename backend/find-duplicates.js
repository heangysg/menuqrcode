// find-duplicates.js
const fs = require('fs');
const path = require('path');

function findFilesContainingText(directory, searchText) {
    const results = [];
    
    function searchInDirectory(dir) {
        const files = fs.readdirSync(dir);
        
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);
            
            if (stat.isDirectory() && file !== 'node_modules') {
                searchInDirectory(filePath);
            } else if (file.endsWith('.js')) {
                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    if (content.includes(searchText)) {
                        results.push(filePath);
                    }
                } catch (err) {
                    console.log('Error reading:', filePath);
                }
            }
        }
    }
    
    searchInDirectory(directory);
    return results;
}

console.log('🔍 Searching for Store model definitions...');
const storeFiles = findFilesContainingText(__dirname, 'mongoose.model.*Store');
console.log('Found files containing Store model:');
storeFiles.forEach(file => console.log('  -', file));

console.log('\n🔍 Searching for Store schema definitions...');
const schemaFiles = findFilesContainingText(__dirname, 'storeSchema');
schemaFiles.forEach(file => console.log('  -', file));