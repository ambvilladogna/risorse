# CSV to JSON Converter

Converts the biblioteca.csv file into `books.json` and `config.json` for the Biblioteca Micologica website.

## Usage

### Basic (default paths)
```bash
node convert-csv.js
```

This assumes:
- Input file: `biblioteca.csv` (in current directory)
- Output directory: `data/` (will be created if needed)

### Custom paths
```bash
node convert-csv.js path/to/input.csv path/to/output-dir
```

Example:
```bash
node convert-csv.js biblioteca.csv ../website/data
```

## CSV Format

The script expects a CSV file with these columns:
- *(empty)* - ID number
- **TITOLO** - Book title
- **SOTTOTITOLO/VOLUME** - Subtitle/Volume
- **COPIE** - Number of copies
- **AUTORI** - Authors
- **EDITORE** - Publisher
- **DATA DI STAMPA** - Publication date
- **TAGS** - Comma-separated tags
- **RATING** - Rating (0-3 stars)
- **NOTE** - Notes

## Output Files

### `books.json`
Array of book objects with structure:
```json
{
    "id": 1,
    "opera": "Book Title",
    "volume": "Volume 1",
    "copie": 1,
    "autori": "Author Name",
    "editore": "Publisher",
    "data": "2007",
    "tags": ["tag1", "tag2"],
    "rating": 3,
    "note": ""
}
```

### `config.json`
Configuration with tag definitions and rating levels:
```json
{
    "tags": [
        {
            "id": "monografia",
            "label": "Monografia",
            "description": "Opere con tag \"monografia\""
        }
    ],
    "ratings": [
        {
            "value": 3,
            "label": "Consigliati",
            "description": "Riferimenti essenziali, consultati regolarmente"
        }
    ]
}
```

## Rating System

- **3 stars** (★★★) - Consigliati: Essential references, regularly consulted
- **2 stars** (★★☆) - Standard: Good resources, occasionally useful
- **1 star** (★☆☆) - Archivio: Historical/donated, rarely consulted
- **0 stars** - Unrated (default)

## Integration with Bun App

When building your Bun app for catalog management, you can:
1. Load `books.json` and `config.json`
2. Provide UI for editing books and assigning ratings
3. Export back to these JSON files
4. Copy/deploy to the Jekyll `_site/data/` directory

## Example Workflow

```bash
# 1. Convert CSV to JSON
node convert-csv.js biblioteca.csv data

# 2. Manually edit data/books.json to add ratings
#    (or use your Bun app to manage this)

# 3. Copy to Jekyll site
cp data/books.json ../website/_site/data/
cp data/config.json ../website/_site/data/

# 4. Rebuild/refresh website
```

## Requirements

- Node.js (any recent version)
- No external dependencies - uses only Node.js built-in modules