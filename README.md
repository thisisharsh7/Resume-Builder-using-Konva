# Interactive Resume Builder

Interactive resume builder using Konva.js for creating professional resumes with drag-and-drop functionality.

## Features

- Interactive canvas with Konva.js
- Drag and drop resume sections
- Real-time text editing
- Multiple templates (Modern, Classic, Minimalist)
- PDF export functionality
- Full styling controls
- Responsive design

## Installation

1. Clone or download this repository
2. Navigate to the project directory
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```
5. Open your browser to `http://localhost:3000`

## Usage

### Basic Operations
1. **Select Element**: Click on any text element
2. **Edit Text**: Double-click to open text editor
3. **Move Elements**: Drag selected elements around the canvas
4. **Delete Elements**: Select and press Delete key
5. **Style Elements**: Use sidebar controls to change appearance

### Adding Sections
- Click any "Add [Section]" button in the sidebar
- New sections appear at the bottom of existing content
- Customize the content by double-clicking

### Templates
- Choose from three pre-built templates:
  - **Modern**: Clean design with colored accents
  - **Classic**: Traditional centered layout
  - **Minimalist**: Simple, clean appearance

### Export Options
- **Export to PDF**: Creates downloadable PDF file
- **Save Template**: Downloads JSON file with current state

## File Structure
```
interact-resume-konva/
├── index.html          # Main HTML structure
├── app.js             # Core application logic
├── styles.css         # CSS styling
├── package.json       # Dependencies and scripts
└── README.md          # Documentation
```

## Technologies Used
- **Konva.js**: 2D canvas library for interactive graphics
- **jsPDF**: PDF generation
- **HTML5 Canvas**: For rendering and export
- **Modern CSS**: Flexbox, Grid, CSS Variables
- **Vanilla JavaScript**: No framework dependencies

## Browser Compatibility
- Chrome 60+
- Firefox 60+
- Safari 12+
- Edge 79+

## Development

### Running Locally
```bash
npm run dev
```

### Production Build
```bash
npm run start
```

## Customization

### Adding New Templates
1. Add new template button in HTML
2. Create template function in `app.js`
3. Define sections and styling for the template

### Adding New Section Types
1. Add button to sidebar in HTML
2. Create event listener in `setupEventListeners()`
3. Define default content for the section type

## Contributing
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License
MIT License - feel free to use this project for personal or commercial purposes.

## Support
For issues or questions, please create an issue in the repository.