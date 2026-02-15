#!/usr/bin/env node

/**
 * CSV to JSON Converter for Biblioteca Micologica
 * 
 * Converts biblioteca.csv into:
 * - books.json: Array of book objects
 * - config.json: Tags configuration extracted from the data
 * 
 * Usage: node convert-csv.js [input.csv] [output-dir]
 */

const fs = require('fs');
const path = require('path');

// Default paths
const DEFAULT_INPUT = 'biblioteca.csv';
const DEFAULT_OUTPUT_DIR = 'data';

// Parse command line arguments
const inputFile = process.argv[2] || DEFAULT_INPUT;
const outputDir = process.argv[3] || DEFAULT_OUTPUT_DIR;

/**
 * Parse CSV line respecting quoted fields
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    
    return result;
}

/**
 * Parse tags string into array
 */
function parseTags(tagString) {
    if (!tagString) return [];
    return tagString.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
}

/**
 * Convert CSV to books array
 */
function convertCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    const headers = parseCSVLine(lines[0]);
    
    // Find column indices
    const indices = {
        id: headers.indexOf(''),  // First empty column is the ID
        titolo: headers.findIndex(h => h.toUpperCase() === 'TITOLO'),
        volumi: headers.findIndex(h => h.toUpperCase() === 'SOTTOTITOLO/VOLUME'),
        copie: headers.findIndex(h => h.toUpperCase() === 'COPIE'),
        autori: headers.findIndex(h => h.toUpperCase() === 'AUTORI'),
        editore: headers.findIndex(h => h.toUpperCase() === 'EDITORE'),
        data: headers.findIndex(h => h.toUpperCase().includes('DATA')),
        tags: headers.findIndex(h => h.toUpperCase() === 'TAGS'),
        rating: headers.findIndex(h => h.toUpperCase() === 'RATING'),
        note: headers.findIndex(h => h.toUpperCase() === 'NOTE')
    };
    
    const books = [];
    const allTags = new Set();
    
    // Process each data row
    for (let i = 1; i < lines.length; i++) {
        const fields = parseCSVLine(lines[i]);
        
        if (fields.length < 2) continue; // Skip empty lines
        
        const tags = parseTags(fields[indices.tags]);
        tags.forEach(tag => allTags.add(tag));
        
        const book = {
            id: parseInt(fields[indices.id]) || i,
            titolo: fields[indices.titolo] || '',
            volume: fields[indices.volumi] || '',
            copie: parseInt(fields[indices.copie]) || 1,
            autori: fields[indices.autori] || '',
            editore: fields[indices.editore] || '',
            data: fields[indices.data] || '',
            tags: tags,
            // rating: 0,  // Default rating - to be set manually
            rating: parseInt(fields[indices.rating]) || 0,
            note: fields[indices.note] || ''
        };
        
        books.push(book);
    }
    
    return { books, allTags: Array.from(allTags).sort() };
}

/**
 * Generate config.json from extracted tags
 */
function generateConfig(allTags) {
    const tagObjects = allTags.map(tag => ({
        id: tag.toLowerCase(),
        label: tag.charAt(0).toUpperCase() + tag.slice(1),
        description: `Opere con tag "${tag}"`
    }));
    
    return {
        tags: tagObjects,
        ratings: [
            {
                value: 3,
                label: "Consigliati",
                description: "Riferimenti essenziali, consultati regolarmente"
            },
            {
                value: 2,
                label: "Standard",
                description: "Buone risorse, utili occasionalmente"
            },
            {
                value: 1,
                label: "Archivio",
                description: "Storici/donati, consultati raramente"
            }
        ]
    };
}

/**
 * Main conversion function
 */
function main() {
    try {
        console.log(`📚 Converting CSV to JSON...`);
        console.log(`   Input:  ${inputFile}`);
        console.log(`   Output: ${outputDir}/`);
        console.log('');
        
        // Read CSV file
        if (!fs.existsSync(inputFile)) {
            console.error(`❌ Error: File "${inputFile}" not found`);
            process.exit(1);
        }
        
        const csvContent = fs.readFileSync(inputFile, 'utf-8');
        
        // Convert CSV
        const { books, allTags } = convertCSV(csvContent);
        const config = generateConfig(allTags);
        
        // Create output directory if it doesn't exist
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        // Write books.json
        const booksPath = path.join(outputDir, 'books.json');
        fs.writeFileSync(booksPath, JSON.stringify(books, null, 4));
        console.log(`✅ Created ${booksPath} (${books.length} books)`);
        
        // Write config.json
        const configPath = path.join(outputDir, 'config.json');
        fs.writeFileSync(configPath, JSON.stringify(config, null, 4));
        console.log(`✅ Created ${configPath} (${allTags.length} tags)`);
        
        console.log('');
        console.log('📊 Summary:');
        console.log(`   Books:  ${books.length}`);
        console.log(`   Tags:   ${allTags.join(', ') || 'none'}`);
        console.log('');
        console.log('⚠️  Note: All books have rating=0 by default.');
        console.log('   You can edit books.json to set ratings (1-3) manually.');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run the script
main();