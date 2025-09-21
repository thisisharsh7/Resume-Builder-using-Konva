class ResumeBuilder {
    constructor() {
        this.stage = null;
        this.layer = null;
        this.selectedElement = null;
        this.isEditing = false;
        this.autoSaveInterval = null;
        this.resumeData = {
            sections: []
        };

        this.init();
        this.setupEventListeners();
        this.startAutoSave();
        this.addToastContainer();
    }

    addToastContainer() {
        const toastContainer = document.createElement('div');
        toastContainer.id = 'toastContainer';
        toastContainer.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            z-index: 2000;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }

    showToast(message, type = 'success', duration = 3000) {
        const toast = document.createElement('div');
        toast.style.cssText = `
            background: ${type === 'success' ? '#333333' : type === 'error' ? '#d32f2f' : '#333333'};
            color: white;
            padding: 10px 16px;
            border-radius: 4px;
            border: 1px solid ${type === 'success' ? '#333333' : type === 'error' ? '#d32f2f' : '#333333'};
            font-size: 13px;
            font-weight: 400;
            transform: translateX(100%);
            transition: transform 0.2s ease;
            max-width: 280px;
        `;
        toast.textContent = message;

        const container = document.getElementById('toastContainer');
        container.appendChild(toast);

        setTimeout(() => {
            toast.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            toast.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (container.contains(toast)) {
                    container.removeChild(toast);
                }
            }, 300);
        }, duration);
    }

    startAutoSave() {
        this.autoSaveInterval = setInterval(() => {
            this.autoSave();
        }, 30000); // Auto-save every 30 seconds
    }

    autoSave() {
        const data = JSON.stringify(this.resumeData);
        localStorage.setItem('resumeBuilder_autoSave', data);
        this.showToast('Auto-saved', 'info', 2000);
    }

    loadAutoSave() {
        const saved = localStorage.getItem('resumeBuilder_autoSave');
        if (saved) {
            try {
                const data = JSON.parse(saved);
                this.resumeData = data;
                this.showToast('Previous work restored', 'info');
                return true;
            } catch (e) {
                console.error('Failed to load auto-save:', e);
            }
        }
        return false;
    }

    init() {
        const width = 800;
        const height = 1000;

        this.stage = new Konva.Stage({
            container: 'container',
            width: width,
            height: height
        });

        this.layer = new Konva.Layer();
        this.guideLayer = new Konva.Layer();
        this.stage.add(this.layer);
        this.stage.add(this.guideLayer);

        // Guide system properties
        this.guidesEnabled = true;
        this.gridSize = 20;
        this.snapThreshold = 10;
        this.alignmentThreshold = 15;

        this.setupScrolling();
        this.addBackground();
        this.addDefaultContent();
    }

    setupScrolling() {
        const container = this.stage.container();

        // Add wheel event for scrolling
        container.addEventListener('wheel', (e) => {
            e.preventDefault();

            const stage = this.stage;
            const oldScale = stage.scaleX();

            // Handle vertical scrolling
            if (!e.ctrlKey && !e.metaKey) {
                const dy = e.deltaY;
                const currentY = stage.y();
                const containerHeight = container.offsetHeight;
                const stageHeight = stage.height();

                // Calculate new Y position
                let newY = currentY - dy;

                // Limit scrolling bounds
                const maxY = 0;
                const minY = -(stageHeight - containerHeight);

                newY = Math.max(minY, Math.min(maxY, newY));

                stage.y(newY);
                stage.batchDraw();

                // Update scroll indicator
                this.updateScrollIndicator();
            }

            // Handle zoom (Ctrl/Cmd + wheel)
            else {
                const pointer = stage.getPointerPosition();
                const mousePointTo = {
                    x: (pointer.x - stage.x()) / oldScale,
                    y: (pointer.y - stage.y()) / oldScale,
                };

                const scaleBy = 1.05;
                const newScale = e.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
                const clampedScale = Math.max(0.3, Math.min(2, newScale));

                stage.scale({ x: clampedScale, y: clampedScale });

                const newPos = {
                    x: pointer.x - mousePointTo.x * clampedScale,
                    y: pointer.y - mousePointTo.y * clampedScale,
                };
                stage.position(newPos);
                stage.batchDraw();
            }
        });

        // Add touch support for mobile
        let lastTouchY = 0;
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                lastTouchY = e.touches[0].clientY;
            }
        });

        container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 1) {
                e.preventDefault();
                const currentTouchY = e.touches[0].clientY;
                const dy = lastTouchY - currentTouchY;
                lastTouchY = currentTouchY;

                const stage = this.stage;
                const currentY = stage.y();
                const containerHeight = container.offsetHeight;
                const stageHeight = stage.height();

                let newY = currentY - dy;
                const maxY = 0;
                const minY = -(stageHeight - containerHeight);

                newY = Math.max(minY, Math.min(maxY, newY));

                stage.y(newY);
                stage.batchDraw();
                this.updateScrollIndicator();
            }
        });

        // Keyboard scrolling
        document.addEventListener('keydown', (e) => {
            if (!this.isEditing && this.stage.container().contains(document.activeElement)) {
                let dy = 0;
                switch(e.key) {
                    case 'ArrowDown':
                        dy = 50;
                        break;
                    case 'ArrowUp':
                        dy = -50;
                        break;
                    case 'PageDown':
                        dy = 200;
                        break;
                    case 'PageUp':
                        dy = -200;
                        break;
                    default:
                        return;
                }

                e.preventDefault();
                const stage = this.stage;
                const currentY = stage.y();
                const containerHeight = this.stage.container().offsetHeight;
                const stageHeight = stage.height();

                let newY = currentY - dy;
                const maxY = 0;
                const minY = -(stageHeight - containerHeight);

                newY = Math.max(minY, Math.min(maxY, newY));

                stage.y(newY);
                stage.batchDraw();
                this.updateScrollIndicator();
            }
        });

        // Add scroll indicator
        this.addScrollIndicator();
    }

    addBackground() {
        const background = new Konva.Rect({
            x: 0,
            y: 0,
            width: this.stage.width(),
            height: this.stage.height(),
            fill: 'white',
            stroke: '#ddd',
            strokeWidth: 1
        });

        this.layer.add(background);
    }

    addDefaultContent() {
        this.addSection('header', 'Your Name', 50, 50, 32, 'bold');
        this.addSection('subtitle', 'Software Developer', 50, 90, 18, 'normal');
        this.addSection('contact', 'email@example.com | (123) 456-7890 | linkedin.com/in/yourname', 50, 120, 14, 'normal');
    }

    addSection(type, text, x, y, fontSize = 16, fontStyle = 'normal') {
        const textNode = new Konva.Text({
            x: x,
            y: y,
            text: text,
            fontSize: fontSize,
            fontFamily: 'Arial',
            fontStyle: fontStyle,
            fill: 'black',
            draggable: true,
            wrap: 'word',
            width: this.stage.width() - 100
        });

        textNode.sectionType = type;
        textNode.id = `${type}_${Date.now()}`;

        textNode.on('click', (e) => {
            e.cancelBubble = true;
            this.selectElement(textNode);
        });

        textNode.on('dblclick', (e) => {
            e.cancelBubble = true;
            this.editText(textNode);
        });

        textNode.on('dragstart', () => {
            this.selectElement(textNode);
            this.showGrid();
            this.stage.container().classList.add('dragging');
        });

        textNode.on('dragmove', () => {
            this.clearGuides();
            this.showGrid();
            this.showAlignmentGuides(textNode);

            // Check if snapping is available and update cursor
            const canSnap = this.checkSnapAvailability(textNode);
            if (canSnap) {
                this.stage.container().classList.add('snap-available');
            } else {
                this.stage.container().classList.remove('snap-available');
            }
        });

        textNode.on('dragend', () => {
            this.snapToGuides(textNode);
            this.hideGridWithAnimation();
            this.stage.container().classList.remove('dragging', 'snap-available');
            this.layer.draw();
            this.updateResumeData(textNode);
        });

        // Add hover effects
        textNode.on('mouseenter', () => {
            if (textNode !== this.selectedElement) {
                // Add subtle hover background
                const textHeight = textNode.getTextHeight ? textNode.getTextHeight() : textNode.height();
                const hoverBg = new Konva.Rect({
                    x: textNode.x() - 3,
                    y: textNode.y() - 1,
                    width: textNode.width() + 6,
                    height: textHeight + 2,
                    fill: '#f8f9fa',
                    cornerRadius: 2,
                    opacity: 0.6,
                    listening: false
                });

                textNode.hoverBg = hoverBg;
                this.layer.add(hoverBg);
                hoverBg.moveToBottom();
                textNode.moveUp();
                this.layer.draw();
                document.body.style.cursor = 'pointer';
            }
        });

        textNode.on('mouseleave', () => {
            if (textNode !== this.selectedElement) {
                // Remove hover background
                if (textNode.hoverBg) {
                    textNode.hoverBg.destroy();
                    textNode.hoverBg = null;
                }
                textNode.stroke('');
                textNode.strokeWidth(0);
                this.layer.draw();
            }
            document.body.style.cursor = 'default';
        });

        // Right-click context menu
        textNode.on('contextmenu', (e) => {
            e.evt.preventDefault();
            this.selectElement(textNode);
            this.showContextMenu(e.evt.clientX, e.evt.clientY, textNode);
        });

        this.layer.add(textNode);

        this.resumeData.sections.push({
            id: textNode.id,
            type: type,
            text: text,
            x: x,
            y: y,
            fontSize: fontSize,
            fontStyle: fontStyle
        });

        // Update canvas height after adding content
        setTimeout(() => {
            this.updateCanvasHeight();
        }, 50); // Small delay to ensure text is rendered

        this.layer.draw();
        return textNode;
    }

    selectElement(element) {
        if (this.selectedElement) {
            // Remove previous selection background
            if (this.selectedElement.selectionBg) {
                this.selectedElement.selectionBg.destroy();
                this.selectedElement.selectionBg = null;
            }
            // Clear any stroke styling
            this.selectedElement.stroke('');
            this.selectedElement.strokeWidth(0);
            this.selectedElement.dash([]);
            this.selectedElement.shadowEnabled(false);
        }

        this.selectedElement = element;

        // Clean selection with subtle background highlight
        const textHeight = element.getTextHeight ? element.getTextHeight() : element.height();
        const bgRect = new Konva.Rect({
            x: element.x() - 6,
            y: element.y() - 3,
            width: element.width() + 12,
            height: textHeight + 6,
            fill: '#f8f9fa',
            stroke: '#e9ecef',
            strokeWidth: 1,
            cornerRadius: 4,
            opacity: 0.9,
            listening: false
        });

        // Store reference for cleanup
        element.selectionBg = bgRect;

        // Add background behind text
        this.layer.add(bgRect);
        bgRect.moveToBottom();
        element.moveUp();

        this.layer.draw();

        // Update sidebar controls
        document.getElementById('fontSize').value = element.fontSize();
        document.getElementById('fontSizeValue').textContent = element.fontSize() + 'px';
        document.getElementById('textColor').value = this.rgbToHex(element.fill());
        document.getElementById('fontFamily').value = element.fontFamily();

        // Show a subtle tooltip instead of heavy UI
        this.showSelectionTooltip(element);
    }

    editText(textNode) {
        if (this.isEditing) return;

        this.isEditing = true;
        textNode.draggable(false);

        // Create contentEditable div with smart positioning
        const editDiv = document.createElement('div');
        editDiv.id = 'inlineEditor';
        editDiv.contentEditable = true;

        // Calculate positions with viewport awareness
        const container = this.stage.container();
        const containerRect = container.getBoundingClientRect();
        const stageX = textNode.x() * this.stage.scaleX() + this.stage.x();
        const stageY = textNode.y() * this.stage.scaleY() + this.stage.y();

        let editorLeft = containerRect.left + stageX;
        let editorTop = containerRect.top + stageY;
        let editorWidth = Math.max(200, textNode.width() * this.stage.scaleX());

        // Viewport boundary detection
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const editorMaxWidth = 400;
        const editorMaxHeight = 300;

        // Adjust if overflowing right
        if (editorLeft + editorWidth > viewportWidth - 20) {
            editorLeft = viewportWidth - editorWidth - 20;
        }
        if (editorLeft < 20) {
            editorLeft = 20;
            editorWidth = Math.min(editorWidth, viewportWidth - 40);
        }

        // Adjust if overflowing bottom
        if (editorTop + editorMaxHeight > viewportHeight - 20) {
            editorTop = viewportHeight - editorMaxHeight - 20;
        }
        if (editorTop < 20) {
            editorTop = 20;
        }

        // Apply calculated positions and styling
        editDiv.style.cssText = `
            position: fixed;
            left: ${editorLeft}px;
            top: ${editorTop}px;
            width: ${editorWidth}px;
            max-width: ${editorMaxWidth}px;
            max-height: ${editorMaxHeight}px;
            min-height: 40px;
            font-size: ${textNode.fontSize()}px;
            font-family: ${textNode.fontFamily()};
            font-weight: ${textNode.fontStyle()};
            color: ${textNode.fill()};
            background: rgba(255, 255, 255, 0.98);
            border: 1px solid #d0d0d0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            padding: 8px 12px;
            z-index: 2000;
            white-space: pre-wrap;
            outline: none;
            border-radius: 6px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            resize: both;
            overflow: auto;
            line-height: 1.4;
        `;

        editDiv.innerText = textNode.text();

        document.body.appendChild(editDiv);
        editDiv.focus();

        // Select all text
        const range = document.createRange();
        range.selectNodeContents(editDiv);
        const selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);

        const saveAndClose = () => {
            textNode.text(editDiv.innerText);
            textNode.draggable(true);
            this.layer.draw();
            this.updateResumeData(textNode);
            document.body.removeChild(editDiv);
            this.isEditing = false;
            this.showToast('Text updated!', 'success', 2000);
            this.autoSave();
        };

        const cancelEdit = () => {
            textNode.draggable(true);
            document.body.removeChild(editDiv);
            this.isEditing = false;
        };

        editDiv.addEventListener('blur', saveAndClose);
        editDiv.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && e.ctrlKey) {
                e.preventDefault();
                saveAndClose();
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                cancelEdit();
            }
        });
    }

    updateResumeData(textNode) {
        const sectionIndex = this.resumeData.sections.findIndex(s => s.id === textNode.id);
        if (sectionIndex !== -1) {
            this.resumeData.sections[sectionIndex] = {
                id: textNode.id,
                type: textNode.sectionType,
                text: textNode.text(),
                x: textNode.x(),
                y: textNode.y(),
                fontSize: textNode.fontSize(),
                fontStyle: textNode.fontStyle()
            };
        }
    }

    setupEventListeners() {
        document.getElementById('addHeaderBtn').onclick = () => {
            const y = this.getNextYPosition();
            this.addSection('header', 'New Header', 50, y, 24, 'bold');
        };

        document.getElementById('addExperienceBtn').onclick = () => {
            const y = this.getNextYPosition();
            this.addSection('experience', 'WORK EXPERIENCE\n\nJob Title - Company Name\nMonth Year - Month Year\n• Achievement or responsibility\n• Another achievement', 50, y, 16, 'normal');
        };

        document.getElementById('addEducationBtn').onclick = () => {
            const y = this.getNextYPosition();
            this.addSection('education', 'EDUCATION\n\nDegree - University Name\nGraduation Year', 50, y, 16, 'normal');
        };

        document.getElementById('addSkillsBtn').onclick = () => {
            const y = this.getNextYPosition();
            this.addSection('skills', 'SKILLS\n\n• Programming Languages: JavaScript, Python, Java\n• Frameworks: React, Node.js, Express\n• Tools: Git, Docker, AWS', 50, y, 16, 'normal');
        };

        document.getElementById('addProjectsBtn').onclick = () => {
            const y = this.getNextYPosition();
            this.addSection('projects', 'PROJECTS\n\nProject Name\n• Description of project\n• Technologies used', 50, y, 16, 'normal');
        };

        document.getElementById('fontSize').oninput = (e) => {
            const value = e.target.value;
            document.getElementById('fontSizeValue').textContent = value + 'px';

            if (this.selectedElement) {
                this.selectedElement.fontSize(parseInt(value));
                this.layer.draw();
                this.updateResumeData(this.selectedElement);
            } else {
                // Apply to all text elements if none selected
                this.layer.children.forEach(child => {
                    if (child.getClassName() === 'Text') {
                        child.fontSize(parseInt(value));
                    }
                });
                this.layer.draw();
                this.showToast('Font size applied to all text', 'info', 2000);
            }
        };

        document.getElementById('textColor').onchange = (e) => {
            if (this.selectedElement) {
                this.selectedElement.fill(e.target.value);
                this.layer.draw();
                this.updateResumeData(this.selectedElement);
            } else {
                // Apply to all text elements if none selected
                this.layer.children.forEach(child => {
                    if (child.getClassName() === 'Text') {
                        child.fill(e.target.value);
                    }
                });
                this.layer.draw();
                this.showToast('Text color applied to all text', 'info', 2000);
            }
        };

        document.getElementById('fontFamily').onchange = (e) => {
            if (this.selectedElement) {
                this.selectedElement.fontFamily(e.target.value);
                this.layer.draw();
                this.updateResumeData(this.selectedElement);
            } else {
                // Apply to all text elements if none selected
                this.layer.children.forEach(child => {
                    if (child.getClassName() === 'Text') {
                        child.fontFamily(e.target.value);
                    }
                });
                this.layer.draw();
                this.showToast('Font family applied to all text', 'info', 2000);
            }
        };

        document.getElementById('backgroundColor').onchange = (e) => {
            const background = this.layer.children[0];
            if (background && background.getClassName() === 'Rect') {
                background.fill(e.target.value);
                this.layer.draw();
            }
        };


        document.getElementById('exportBtn').onclick = () => {
            this.exportToPDF();
        };

        document.getElementById('saveBtn').onclick = () => {
            this.saveTemplate();
        };

        document.getElementById('modernTemplate').onclick = () => {
            this.applyTemplate('modern');
        };

        document.getElementById('classicTemplate').onclick = () => {
            this.applyTemplate('classic');
        };

        document.getElementById('minimalistTemplate').onclick = () => {
            this.applyTemplate('minimalist');
        };

        this.stage.on('click', (e) => {
            if (e.target === this.stage || e.target.getClassName() === 'Rect') {
                this.deselectAll();
            }
            // Focus the container for keyboard navigation
            this.stage.container().focus();
        });

        // Make container focusable
        this.stage.container().tabIndex = 0;
        this.stage.container().style.outline = 'none';

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete' && this.selectedElement && !this.isEditing) {
                this.deleteSelectedElement();
            }
            if (e.key === 'g' || e.key === 'G') {
                if (!this.isEditing) {
                    e.preventDefault();
                    this.toggleGuides();
                }
            }
        });
    }

    getNextYPosition(extraPadding = 50) {
        let maxY = 150;
        this.layer.children.forEach(child => {
            if (child.getClassName() === 'Text') {
                // For multi-line text, height might not be accurate until rendered
                let elementHeight = child.height();

                // If text contains newlines, calculate approximate height
                const textContent = child.text();
                const lineCount = (textContent.match(/\n/g) || []).length + 1;
                const approximateHeight = lineCount * (child.fontSize() * 1.2); // 1.2 line height multiplier

                // Use the larger of actual height or calculated height
                elementHeight = Math.max(elementHeight, approximateHeight);

                const elementBottom = child.y() + elementHeight;
                if (elementBottom > maxY) {
                    maxY = elementBottom;
                }
            }
            // Also check for Line elements (dividers)
            if (child.getClassName() === 'Line') {
                const elementBottom = child.y() + 10; // Lines are thin
                if (elementBottom > maxY) {
                    maxY = elementBottom;
                }
            }
        });
        return maxY + extraPadding;
    }

    updateCanvasHeight() {
        const contentHeight = this.getNextYPosition(100); // Extra padding at bottom
        const minHeight = 1000;
        const newHeight = Math.max(minHeight, contentHeight);

        // Update stage height
        this.stage.height(newHeight);

        // Update background to match new height
        const background = this.layer.children[0];
        if (background && background.getClassName() === 'Rect') {
            background.height(newHeight);
        }

        this.layer.draw();
    }

    addScrollIndicator() {
        // Add scroll indicator to the right side of the canvas container
        const container = document.getElementById('container').parentElement;

        const scrollIndicator = document.createElement('div');
        scrollIndicator.id = 'scrollIndicator';
        scrollIndicator.style.cssText = `
            position: absolute;
            right: 10px;
            top: 20px;
            width: 8px;
            background: rgba(0, 0, 0, 0.1);
            border-radius: 4px;
            opacity: 0;
            transition: opacity 0.3s ease;
            z-index: 1000;
        `;

        const scrollThumb = document.createElement('div');
        scrollThumb.style.cssText = `
            width: 100%;
            background: rgba(102, 126, 234, 0.8);
            border-radius: 4px;
            transition: all 0.3s ease;
        `;

        scrollIndicator.appendChild(scrollThumb);
        container.appendChild(scrollIndicator);

        this.scrollIndicator = scrollIndicator;
        this.scrollThumb = scrollThumb;
    }

    updateScrollIndicator() {
        if (!this.scrollIndicator) return;

        const stage = this.stage;
        const container = stage.container();
        const containerHeight = container.offsetHeight;
        const stageHeight = stage.height();

        if (stageHeight <= containerHeight) {
            this.scrollIndicator.style.opacity = '0';
            return;
        }

        // Show indicator
        this.scrollIndicator.style.opacity = '0.7';

        // Calculate indicator height and position
        const indicatorHeight = containerHeight - 40; // Padding
        this.scrollIndicator.style.height = indicatorHeight + 'px';

        const scrollRatio = containerHeight / stageHeight;
        const thumbHeight = Math.max(20, indicatorHeight * scrollRatio);
        this.scrollThumb.style.height = thumbHeight + 'px';

        // Calculate thumb position
        const scrollableHeight = stageHeight - containerHeight;
        const currentScroll = -stage.y();
        const scrollProgress = currentScroll / scrollableHeight;
        const thumbTop = (indicatorHeight - thumbHeight) * scrollProgress;

        this.scrollThumb.style.transform = `translateY(${thumbTop}px)`;

        // Auto-hide after inactivity
        clearTimeout(this.scrollTimeout);
        this.scrollTimeout = setTimeout(() => {
            if (this.scrollIndicator) {
                this.scrollIndicator.style.opacity = '0';
            }
        }, 2000);
    }

    deleteSelectedElement() {
        if (this.selectedElement) {
            const elementType = this.selectedElement.sectionType || 'element';
            const elementId = this.selectedElement.id;

            // Hide any tooltips or context menus
            this.hideSelectionTooltip();
            this.hideContextMenu();

            // Store reference for potential undo
            const deletedElement = {
                id: elementId,
                type: this.selectedElement.sectionType,
                text: this.selectedElement.text(),
                x: this.selectedElement.x(),
                y: this.selectedElement.y(),
                fontSize: this.selectedElement.fontSize(),
                fontStyle: this.selectedElement.fontStyle()
            };

            // Remove from canvas
            this.selectedElement.destroy();
            this.selectedElement = null;
            this.layer.draw();

            // Remove from data
            this.resumeData.sections = this.resumeData.sections.filter(s => s.id !== elementId);

            // Show success feedback
            this.showToast(`${elementType.charAt(0).toUpperCase() + elementType.slice(1)} deleted!`, 'success', 3000);

            // Update canvas height after deletion
            setTimeout(() => {
                this.updateCanvasHeight();
            }, 100);

            // Auto-save
            this.autoSave();
        }
    }

    deselectAll() {
        if (this.selectedElement) {
            // Remove selection background
            if (this.selectedElement.selectionBg) {
                this.selectedElement.selectionBg.destroy();
                this.selectedElement.selectionBg = null;
            }
            // Clear any stroke styling
            this.selectedElement.stroke('');
            this.selectedElement.strokeWidth(0);
            this.selectedElement.dash([]);
            this.selectedElement.shadowEnabled(false);
            this.selectedElement = null;
            this.layer.draw();
        }

        // Hide element management UI
        this.hideSelectionTooltip();
    }

    showSelectionTooltip(element) {
        // Remove any existing tooltip
        this.hideSelectionTooltip();

        // Create subtle selection indicator
        const container = this.stage.container();
        const containerRect = container.getBoundingClientRect();

        // Create a small, subtle tooltip
        const tooltip = document.createElement('div');
        tooltip.id = 'selectionTooltip';
        tooltip.style.cssText = `
            position: absolute;
            right: 20px;
            top: 80px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 1000;
            pointer-events: none;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        // Use Lucide icons in tooltip
        tooltip.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
                <i data-lucide="edit-3" style="width: 14px; height: 14px;"></i>
                <span>Double-click to edit</span>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
                <i data-lucide="trash-2" style="width: 14px; height: 14px;"></i>
                <span>Delete key to remove</span>
            </div>
        `;

        document.body.appendChild(tooltip);

        // Initialize lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        // Show with animation
        setTimeout(() => {
            tooltip.style.opacity = '1';
        }, 100);

        // Auto hide after 3 seconds
        setTimeout(() => {
            this.hideSelectionTooltip();
        }, 3000);

        this.currentTooltip = tooltip;
    }

    hideSelectionTooltip() {
        if (this.currentTooltip) {
            this.currentTooltip.style.opacity = '0';
            setTimeout(() => {
                if (this.currentTooltip && document.body.contains(this.currentTooltip)) {
                    document.body.removeChild(this.currentTooltip);
                }
                this.currentTooltip = null;
            }, 300);
        }
        this.hideContextMenu();
    }

    showContextMenu(x, y, element) {
        this.hideContextMenu();

        const contextMenu = document.createElement('div');
        contextMenu.id = 'contextMenu';
        contextMenu.style.cssText = `
            position: fixed;
            left: ${x}px;
            top: ${y}px;
            background: white;
            border: 1px solid #ddd;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
            z-index: 2000;
            min-width: 150px;
            overflow: hidden;
        `;

        const deleteOption = document.createElement('div');
        deleteOption.style.cssText = `
            padding: 12px 16px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
            transition: background 0.2s ease;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        deleteOption.innerHTML = '<i data-lucide="trash-2" style="width: 16px; height: 16px;"></i><span>Delete Element</span>';
        deleteOption.onmouseover = () => deleteOption.style.background = '#f5f5f5';
        deleteOption.onmouseleave = () => deleteOption.style.background = 'white';
        deleteOption.onclick = () => {
            this.deleteSelectedElement();
            this.hideContextMenu();
        };

        const editOption = document.createElement('div');
        editOption.style.cssText = `
            padding: 12px 16px;
            cursor: pointer;
            transition: background 0.2s ease;
            font-size: 14px;
            display: flex;
            align-items: center;
            gap: 8px;
        `;
        editOption.innerHTML = '<i data-lucide="edit-3" style="width: 16px; height: 16px;"></i><span>Edit Text</span>';
        editOption.onmouseover = () => editOption.style.background = '#f5f5f5';
        editOption.onmouseleave = () => editOption.style.background = 'white';
        editOption.onclick = () => {
            this.editText(element);
            this.hideContextMenu();
        };

        contextMenu.appendChild(deleteOption);
        contextMenu.appendChild(editOption);
        document.body.appendChild(contextMenu);

        // Initialize lucide icons
        if (window.lucide) {
            window.lucide.createIcons();
        }

        this.currentContextMenu = contextMenu;

        // Hide context menu when clicking elsewhere
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
        }, 100);
    }

    hideContextMenu() {
        if (this.currentContextMenu) {
            document.body.removeChild(this.currentContextMenu);
            this.currentContextMenu = null;
        }
    }

    applyTemplate(templateName) {
        this.layer.destroyChildren();
        this.resumeData.sections = [];

        this.addBackground();

        switch (templateName) {
            case 'modern':
                this.applyModernTemplate();
                this.showToast('Modern template applied!', 'success');
                break;
            case 'classic':
                this.applyClassicTemplate();
                this.showToast('Classic template applied!', 'success');
                break;
            case 'minimalist':
                this.applyMinimalistTemplate();
                this.showToast('Minimalist template applied!', 'success');
                break;
        }
    }

    applyModernTemplate() {
        document.getElementById('backgroundColor').value = '#ffffff';
        const background = this.layer.children[0];
        background.fill('#ffffff');

        let currentY = 80; // Start with consistent top margin

        // === HEADER SECTION ===
        this.addSection('header', 'ALEXANDRA CHEN', 60, currentY, 28, 'bold');
        currentY += 40;

        this.addSection('subtitle', 'Senior Full Stack Software Engineer', 60, currentY, 16, 'normal');
        currentY += 30;

        this.addSection('contact', 'alexandra.chen@email.com  |  (555) 987-6543  |  San Francisco, CA\nlinkedin.com/in/alexandra-chen  |  github.com/alexchen', 60, currentY, 12, 'normal');
        currentY += 45;

        // Add divider line
        const divider = new Konva.Line({
            points: [60, currentY, 740, currentY],
            stroke: '#666666',
            strokeWidth: 1
        });
        this.layer.add(divider);
        currentY += 30;

        // === PROFESSIONAL SUMMARY ===
        this.addSection('summary', 'PROFESSIONAL SUMMARY', 60, currentY, 14, 'bold');
        currentY += 25;

        this.addSection('summary-content', 'Experienced Full Stack Engineer with 6+ years developing scalable web applications. Expertise in React, Node.js, and cloud technologies. Led cross-functional teams of 5+ developers and improved system performance by 60% through optimization initiatives.', 60, currentY, 12, 'normal');
        currentY += 55;

        // === EXPERIENCE SECTION ===
        this.addSection('experience', 'PROFESSIONAL EXPERIENCE', 60, currentY, 14, 'bold');
        currentY += 25;

        // Job 1
        this.addSection('job1-title', 'Senior Software Engineer', 60, currentY, 12, 'bold');
        currentY += 20;
        this.addSection('job1-company', 'TechFlow Solutions  |  March 2021 - Present', 60, currentY, 11, 'normal');
        currentY += 20;
        this.addSection('job1-desc', '• Led development of microservices architecture serving 2M+ users daily\n• Architected CI/CD pipeline reducing deployment time by 75%\n• Mentored 5 junior developers and conducted comprehensive code reviews\n• Built real-time analytics dashboard using React, D3.js, and WebSocket APIs', 60, currentY, 11, 'normal');
        currentY += 75;

        // Job 2
        this.addSection('job2-title', 'Software Engineer', 60, currentY, 12, 'bold');
        currentY += 20;
        this.addSection('job2-company', 'InnovateLabs  |  June 2019 - March 2021', 60, currentY, 11, 'normal');
        currentY += 20;
        this.addSection('job2-desc', '• Developed responsive web applications using React and TypeScript\n• Optimized database queries improving response time by 45%\n• Collaborated with design team to implement pixel-perfect UI components\n• Implemented automated testing suite increasing code coverage to 90%', 60, currentY, 11, 'normal');
        currentY += 75;

        // Job 3
        this.addSection('job3-title', 'Junior Developer', 60, currentY, 12, 'bold');
        currentY += 20;
        this.addSection('job3-company', 'StartupXYZ  |  September 2017 - May 2019', 60, currentY, 11, 'normal');
        currentY += 20;
        this.addSection('job3-desc', '• Built RESTful APIs using Node.js and Express.js\n• Integrated third-party payment systems (Stripe, PayPal)\n• Participated in agile development cycles and sprint planning sessions', 60, currentY, 11, 'normal');
        currentY += 65;

        // === EDUCATION ===
        this.addSection('education', 'EDUCATION', 60, currentY, 14, 'bold');
        currentY += 25;
        this.addSection('education-content', 'Bachelor of Science in Computer Science\nUniversity of California, Berkeley  |  Graduated May 2017  |  GPA: 3.8/4.0\n\nRelevant Coursework: Data Structures, Algorithms, Database Systems, Software Engineering', 60, currentY, 11, 'normal');
        currentY += 75;

        // === TECHNICAL SKILLS ===
        this.addSection('skills', 'TECHNICAL SKILLS', 60, currentY, 14, 'bold');
        currentY += 25;
        this.addSection('skills-content', 'Languages: JavaScript, TypeScript, Python, Java, Go\nFrontend: React, Vue.js, Angular, HTML5, CSS3, SASS, Tailwind CSS\nBackend: Node.js, Express.js, Django, Spring Boot, GraphQL\nDatabases: PostgreSQL, MongoDB, Redis, MySQL, DynamoDB\nCloud/DevOps: AWS, Docker, Kubernetes, Jenkins, Terraform, GitHub Actions\nTools: Git, Webpack, Jest, Cypress, Figma, Jira, Postman', 60, currentY, 11, 'normal');
        currentY += 95;

        // === KEY PROJECTS ===
        this.addSection('projects', 'KEY PROJECTS', 60, currentY, 14, 'bold');
        currentY += 25;

        // Project 1
        this.addSection('project1', 'E-Commerce Platform (2023)', 60, currentY, 12, 'bold');
        currentY += 20;
        this.addSection('project1-desc', '• Built scalable platform handling 50K+ daily transactions\n• Technologies: React, Node.js, PostgreSQL, AWS, Stripe API\n• Features: Real-time inventory, payment processing, admin dashboard', 60, currentY, 11, 'normal');
        currentY += 55;

        // Project 2
        this.addSection('project2', 'Real-Time Chat Application (2022)', 60, currentY, 12, 'bold');
        currentY += 20;
        this.addSection('project2-desc', '• Developed messaging app with 10K+ active users\n• Technologies: React, Socket.io, Express.js, MongoDB\n• Features: File sharing, video calls, group chats, message encryption', 60, currentY, 11, 'normal');
        currentY += 55;

        // Update canvas height to fit content
        this.updateCanvasHeight();
    }

    applyClassicTemplate() {
        document.getElementById('backgroundColor').value = '#ffffff';
        const background = this.layer.children[0];
        background.fill('#ffffff');

        let currentY = 80; // Start with consistent top margin

        // === CENTERED HEADER ===
        this.addSection('header', 'MICHAEL JOHNSON', 300, currentY, 26, 'bold');
        currentY += 35;

        this.addSection('contact', '456 Oak Avenue, San Francisco, CA 94102\n(555) 234-5678  |  michael.johnson@email.com\nlinkedin.com/in/michael-johnson-dev', 240, currentY, 11, 'normal');
        currentY += 60;

        // === OBJECTIVE ===
        this.addSection('objective', 'PROFESSIONAL OBJECTIVE', 60, currentY, 14, 'bold');
        currentY += 25;
        this.addSection('objective-content', 'Dedicated Software Engineer with 5+ years of experience in developing robust web applications and leading technical initiatives. Seeking to leverage expertise in full-stack development and team leadership to drive innovation at a forward-thinking technology company.', 60, currentY, 12, 'normal');
        currentY += 65;

        // === EXPERIENCE ===
        this.addSection('experience', 'PROFESSIONAL EXPERIENCE', 60, currentY, 14, 'bold');
        currentY += 25;

        // Job 1
        this.addSection('job1-title', 'Lead Software Engineer', 60, currentY, 12, 'bold');
        currentY += 20;
        this.addSection('job1-company', 'Digital Innovations Inc.  |  San Francisco, CA  |  January 2022 - Present', 60, currentY, 11, 'normal');
        currentY += 20;
        this.addSection('job1-desc', '• Spearheaded development of customer-facing web platform serving 500K+ users\n• Implemented microservices architecture reducing system latency by 40%\n• Led cross-functional team of 8 engineers and designers\n• Established coding standards and mentored 3 junior developers', 60, currentY, 11, 'normal');
        currentY += 75;

        // Job 2
        this.addSection('job2-title', 'Software Engineer', 60, currentY, 12, 'bold');
        currentY += 20;
        this.addSection('job2-company', 'CloudTech Solutions  |  San Francisco, CA  |  March 2020 - December 2021', 60, currentY, 11, 'normal');
        currentY += 20;
        this.addSection('job2-desc', '• Developed and maintained RESTful APIs using Node.js and Express\n• Built responsive frontend applications with React and Redux\n• Collaborated with product managers to define technical requirements\n• Optimized database performance achieving 50% faster query execution', 60, currentY, 11, 'normal');
        currentY += 75;

        // Job 3
        this.addSection('job3-title', 'Junior Software Developer', 60, currentY, 12, 'bold');
        currentY += 20;
        this.addSection('job3-company', 'WebFlow Agency  |  Oakland, CA  |  June 2018 - February 2020', 60, currentY, 11, 'normal');
        currentY += 20;
        this.addSection('job3-desc', '• Created custom WordPress themes and plugins for client websites\n• Implemented responsive designs and cross-browser compatibility\n• Participated in code reviews and agile development processes', 60, currentY, 11, 'normal');
        currentY += 65;

        // === EDUCATION ===
        this.addSection('education', 'EDUCATION', 60, currentY, 14, 'bold');
        currentY += 25;
        this.addSection('education-content', 'Master of Science in Computer Science\nStanford University  |  Stanford, CA  |  Graduated June 2018  |  GPA: 3.9/4.0\nConcentration: Software Engineering and Systems\n\nBachelor of Science in Information Technology\nUniversity of California, Davis  |  Davis, CA  |  Graduated May 2016  |  Magna Cum Laude\nRelevant Coursework: Data Structures, Software Engineering, Database Design', 60, currentY, 11, 'normal');
        currentY += 110;

        // === TECHNICAL SKILLS ===
        this.addSection('skills', 'TECHNICAL PROFICIENCIES', 60, currentY, 14, 'bold');
        currentY += 25;
        this.addSection('skills-content', 'Programming Languages: JavaScript, Python, Java, C++, TypeScript\nWeb Technologies: HTML5, CSS3, React, Angular, Vue.js, Node.js\nBackend Frameworks: Express.js, Django, Spring Boot, Flask\nDatabases: MySQL, PostgreSQL, MongoDB, Redis, DynamoDB\nCloud Platforms: AWS, Google Cloud Platform, Microsoft Azure\nDevelopment Tools: Git, Docker, Jenkins, Webpack, VS Code, Postman\nMethodologies: Agile, Scrum, Test-Driven Development, DevOps', 60, currentY, 11, 'normal');
        currentY += 105;

        // === ACHIEVEMENTS ===
        this.addSection('achievements', 'NOTABLE ACHIEVEMENTS', 60, currentY, 14, 'bold');
        currentY += 25;
        this.addSection('achievements-content', '• AWS Certified Solutions Architect - Professional (2023)\n• Led team that won "Best Innovation Award" at company hackathon (2022)\n• Published article "Optimizing React Performance" in Tech Weekly (2021)\n• Volunteer coding instructor at local community center (2019-Present)\n• Contributed to open-source projects with 500+ GitHub stars', 60, currentY, 11, 'normal');

        // Update canvas height to fit content
        this.updateCanvasHeight();
    }

    applyMinimalistTemplate() {
        document.getElementById('backgroundColor').value = '#ffffff';
        const background = this.layer.children[0];
        background.fill('#ffffff');

        let currentY = 80; // Start with consistent top margin

        // === HEADER SECTION ===
        this.addSection('header', 'SARAH WILLIAMS', 60, currentY, 24, 'bold');
        currentY += 35;

        this.addSection('contact', 'sarah.williams@email.com  •  (555) 345-6789  •  San Francisco, CA\ngithub.com/sarahw  •  linkedin.com/in/sarah-williams', 60, currentY, 11, 'normal');
        currentY += 50;

        // === EXPERIENCE SECTION ===
        this.addSection('experience', 'EXPERIENCE', 60, currentY, 13, 'bold');
        currentY += 25;

        // Job 1
        this.addSection('job1-title', 'Senior Frontend Developer', 60, currentY, 12, 'bold');
        currentY += 18;
        this.addSection('job1-company', 'ModernTech Co  •  2022 - Present', 60, currentY, 11, 'normal');
        currentY += 20;
        this.addSection('job1-desc', 'Lead development of React applications. Built component library used across\n15+ products. Improved performance by 35% through code optimization.\nCollaborated with cross-functional teams on product development.', 60, currentY, 11, 'normal');
        currentY += 65;

        // Job 2
        this.addSection('job2-title', 'Frontend Developer', 60, currentY, 12, 'bold');
        currentY += 18;
        this.addSection('job2-company', 'StartupHub  •  2020 - 2022', 60, currentY, 11, 'normal');
        currentY += 20;
        this.addSection('job2-desc', 'Developed responsive web applications using React and TypeScript.\nCollaborated with UX team on design implementation. Maintained 98% test coverage.\nImplemented automated testing and continuous integration workflows.', 60, currentY, 11, 'normal');
        currentY += 65;

        // Job 3
        this.addSection('job3-title', 'Junior Developer', 60, currentY, 12, 'bold');
        currentY += 18;
        this.addSection('job3-company', 'WebCrafters  •  2018 - 2020', 60, currentY, 11, 'normal');
        currentY += 20;
        this.addSection('job3-desc', 'Built custom websites using HTML, CSS, and JavaScript.\nLearned modern frameworks and development best practices.\nParticipated in code reviews and agile development processes.', 60, currentY, 11, 'normal');
        currentY += 65;

        // === EDUCATION ===
        this.addSection('education', 'EDUCATION', 60, currentY, 13, 'bold');
        currentY += 25;
        this.addSection('education-content', 'Bachelor of Science in Computer Science\nUC San Diego  •  2018\nRelevant coursework: Web Development, Data Structures, Software Engineering', 60, currentY, 11, 'normal');
        currentY += 65;

        // === SKILLS ===
        this.addSection('skills', 'SKILLS', 60, currentY, 13, 'bold');
        currentY += 25;
        this.addSection('skills-content', 'JavaScript, TypeScript, React, Next.js, HTML/CSS, Node.js, Python\nGit, AWS, MongoDB, PostgreSQL, Jest, Figma, Docker, Jenkins\nAgile Development, Test-Driven Development, Responsive Design', 60, currentY, 11, 'normal');
        currentY += 65;

        // === PROJECTS ===
        this.addSection('projects', 'PROJECTS', 60, currentY, 13, 'bold');
        currentY += 25;

        // Project 1
        this.addSection('project1', 'Portfolio Website', 60, currentY, 12, 'bold');
        currentY += 18;
        this.addSection('project1-tech', 'React, Next.js, Tailwind CSS', 60, currentY, 10, 'normal');
        currentY += 18;
        this.addSection('project1-desc', 'Personal portfolio showcasing projects and skills.\nDeployed on Vercel with 99.9% uptime and optimized performance.', 60, currentY, 11, 'normal');
        currentY += 45;

        // Project 2
        this.addSection('project2', 'Task Manager App', 60, currentY, 12, 'bold');
        currentY += 18;
        this.addSection('project2-tech', 'React, Firebase, Material-UI', 60, currentY, 10, 'normal');
        currentY += 18;
        this.addSection('project2-desc', 'Collaborative task management tool with real-time updates.\nUsed by 200+ users in beta testing with positive feedback.', 60, currentY, 11, 'normal');
        currentY += 45;

        // Project 3
        this.addSection('project3', 'Weather Dashboard', 60, currentY, 12, 'bold');
        currentY += 18;
        this.addSection('project3-tech', 'Vue.js, OpenWeather API', 60, currentY, 10, 'normal');
        currentY += 18;
        this.addSection('project3-desc', 'Responsive weather application with location-based forecasting\nand historical data visualization using Chart.js.', 60, currentY, 11, 'normal');
        currentY += 45;

        // Update canvas height to fit content
        this.updateCanvasHeight();
        this.layer.batchDraw();
    }

    async exportToPDF() {
        try {
            if (this.selectedElement) {
                this.deselectAll();
            }

            this.showToast('Generating PDF...', 'info', 2000);

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            // Set up page dimensions and margins
            const pageWidth = 210; // A4 width in mm
            const pageHeight = 297; // A4 height in mm
            const margin = 20;
            const contentWidth = pageWidth - (margin * 2);
            let currentY = margin;

            // Collect and sort all text elements by Y position
            const textElements = [];
            this.layer.children.forEach(child => {
                if (child.getClassName() === 'Text' && child.visible()) {
                    textElements.push({
                        text: child.text(),
                        x: child.x(),
                        y: child.y(),
                        fontSize: child.fontSize(),
                        fontFamily: child.fontFamily(),
                        fill: child.fill(),
                        fontStyle: child.fontStyle()
                    });
                }
            });

            // Sort by Y position
            textElements.sort((a, b) => a.y - b.y);

            // Group elements by sections and apply proper formatting
            for (let i = 0; i < textElements.length; i++) {
                const element = textElements[i];
                const text = element.text;
                const isHeader = element.fontSize >= 24;
                const isSectionHeader = element.fontSize >= 18 && element.fontSize < 24;
                const isSubHeader = element.fontSize >= 14 && element.fontSize < 18;

                // Set font based on element type
                if (isHeader) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(18);
                    if (i > 0) currentY += 6; // Extra space before headers (except first)
                } else if (isSectionHeader) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(14);
                    currentY += 5; // Space before section headers
                } else if (isSubHeader) {
                    pdf.setFont('helvetica', 'bold');
                    pdf.setFontSize(11);
                    currentY += 3; // Space before sub headers
                } else {
                    pdf.setFont('helvetica', 'normal');
                    pdf.setFontSize(10);
                    currentY += 1; // Minimal space for body text
                }

                // Handle multi-line text
                const lines = text.split('\n');
                for (let j = 0; j < lines.length; j++) {
                    const line = lines[j].trim();
                    if (line) {
                        // Check if we need a new page
                        if (currentY > pageHeight - margin - 15) {
                            pdf.addPage();
                            currentY = margin;
                        }

                        // Split long lines to fit page width
                        const textLines = pdf.splitTextToSize(line, contentWidth);
                        for (let k = 0; k < textLines.length; k++) {
                            pdf.text(textLines[k], margin, currentY);
                            currentY += pdf.getFontSize() * 0.4; // Tight line height
                        }
                    } else {
                        currentY += 2; // Space for empty lines
                    }
                }

                // Add spacing after elements based on type
                if (isHeader) {
                    currentY += 4;
                } else if (isSectionHeader) {
                    currentY += 3;
                } else if (isSubHeader) {
                    currentY += 2;
                } else {
                    currentY += 1;
                }
            }

            pdf.save('resume.pdf');
            this.showToast('Resume exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Failed to export resume. Please try again.', 'error');
        }
    }

    saveTemplate() {
        const templateData = {
            resumeData: this.resumeData,
            timestamp: new Date().toISOString()
        };

        const dataStr = JSON.stringify(templateData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'resume-template.json';
        link.click();

        URL.revokeObjectURL(url);
        this.showToast('Template saved successfully!', 'success');
    }

    // ===== GUIDE SYSTEM =====

    showGrid() {
        if (!this.guidesEnabled) return;

        this.clearGuides();
        const stage = this.stage;
        const width = stage.width();
        const height = stage.height();

        // Vertical grid lines
        for (let x = 0; x <= width; x += this.gridSize) {
            const line = new Konva.Line({
                points: [x, 0, x, height],
                stroke: '#f0f0f0',
                strokeWidth: 1,
                opacity: 0.5,
                listening: false
            });
            this.guideLayer.add(line);
        }

        // Horizontal grid lines
        for (let y = 0; y <= height; y += this.gridSize) {
            const line = new Konva.Line({
                points: [0, y, width, y],
                stroke: '#f0f0f0',
                strokeWidth: 1,
                opacity: 0.5,
                listening: false
            });
            this.guideLayer.add(line);
        }

        this.guideLayer.batchDraw();
    }

    hideGrid() {
        this.clearGuides();
    }

    hideGridWithAnimation() {
        // Add fade-out animation to guides before clearing
        this.guideLayer.children.forEach(child => {
            child.to({
                opacity: 0,
                duration: 0.2,
                onFinish: () => {
                    this.clearGuides();
                }
            });
        });
    }

    checkSnapAvailability(element) {
        const elementBounds = {
            x: element.x(),
            y: element.y(),
            width: element.width(),
            height: element.getTextHeight ? element.getTextHeight() : element.height()
        };

        // Check grid snapping
        const gridSnapX = Math.round(elementBounds.x / this.gridSize) * this.gridSize;
        const gridSnapY = Math.round(elementBounds.y / this.gridSize) * this.gridSize;

        if (Math.abs(elementBounds.x - gridSnapX) < this.snapThreshold ||
            Math.abs(elementBounds.y - gridSnapY) < this.snapThreshold) {
            return true;
        }

        // Check element alignment snapping
        let canSnap = false;
        this.layer.children.forEach(child => {
            if (child === element || child.getClassName() !== 'Text') return;

            const targetBounds = {
                x: child.x(),
                y: child.y(),
                width: child.width(),
                height: child.getTextHeight ? child.getTextHeight() : child.height()
            };

            if (Math.abs(elementBounds.x - targetBounds.x) < this.alignmentThreshold ||
                Math.abs(elementBounds.y - targetBounds.y) < this.alignmentThreshold) {
                canSnap = true;
            }
        });

        return canSnap;
    }

    clearGuides() {
        this.guideLayer.removeChildren();
        this.guideLayer.batchDraw();
    }

    showAlignmentGuides(draggedElement) {
        if (!this.guidesEnabled) return;

        const draggedBounds = {
            x: draggedElement.x(),
            y: draggedElement.y(),
            width: draggedElement.width(),
            height: draggedElement.getTextHeight ? draggedElement.getTextHeight() : draggedElement.height(),
            centerX: draggedElement.x() + (draggedElement.width() / 2),
            centerY: draggedElement.y() + (draggedElement.getTextHeight ? draggedElement.getTextHeight() : draggedElement.height()) / 2
        };

        const guides = [];

        // Check alignment with other elements
        this.layer.children.forEach(child => {
            if (child === draggedElement || child.getClassName() !== 'Text') return;

            const targetBounds = {
                x: child.x(),
                y: child.y(),
                width: child.width(),
                height: child.getTextHeight ? child.getTextHeight() : child.height(),
                centerX: child.x() + (child.width() / 2),
                centerY: child.y() + (child.getTextHeight ? child.getTextHeight() : child.height()) / 2
            };

            // Vertical alignment guides
            if (Math.abs(draggedBounds.x - targetBounds.x) < this.alignmentThreshold) {
                guides.push({
                    type: 'vertical',
                    x: targetBounds.x,
                    color: '#ff4444'
                });
            }
            if (Math.abs(draggedBounds.centerX - targetBounds.centerX) < this.alignmentThreshold) {
                guides.push({
                    type: 'vertical',
                    x: targetBounds.centerX,
                    color: '#ff4444'
                });
            }
            if (Math.abs((draggedBounds.x + draggedBounds.width) - (targetBounds.x + targetBounds.width)) < this.alignmentThreshold) {
                guides.push({
                    type: 'vertical',
                    x: targetBounds.x + targetBounds.width,
                    color: '#ff4444'
                });
            }

            // Horizontal alignment guides
            if (Math.abs(draggedBounds.y - targetBounds.y) < this.alignmentThreshold) {
                guides.push({
                    type: 'horizontal',
                    y: targetBounds.y,
                    color: '#ff4444'
                });
            }
            if (Math.abs(draggedBounds.centerY - targetBounds.centerY) < this.alignmentThreshold) {
                guides.push({
                    type: 'horizontal',
                    y: targetBounds.centerY,
                    color: '#ff4444'
                });
            }
            if (Math.abs((draggedBounds.y + draggedBounds.height) - (targetBounds.y + targetBounds.height)) < this.alignmentThreshold) {
                guides.push({
                    type: 'horizontal',
                    y: targetBounds.y + targetBounds.height,
                    color: '#ff4444'
                });
            }
        });

        // Draw guides
        guides.forEach(guide => {
            let line;
            if (guide.type === 'vertical') {
                line = new Konva.Line({
                    points: [guide.x, 0, guide.x, this.stage.height()],
                    stroke: guide.color,
                    strokeWidth: 2,
                    opacity: 0.8,
                    listening: false
                });
            } else {
                line = new Konva.Line({
                    points: [0, guide.y, this.stage.width(), guide.y],
                    stroke: guide.color,
                    strokeWidth: 2,
                    opacity: 0.8,
                    listening: false
                });
            }
            this.guideLayer.add(line);
        });

        this.guideLayer.batchDraw();
    }

    snapToGuides(element) {
        if (!this.guidesEnabled) return;

        const elementBounds = {
            x: element.x(),
            y: element.y(),
            width: element.width(),
            height: element.getTextHeight ? element.getTextHeight() : element.height()
        };

        let snappedX = elementBounds.x;
        let snappedY = elementBounds.y;
        let hasSnapped = false;

        // Snap to grid
        const gridSnapX = Math.round(elementBounds.x / this.gridSize) * this.gridSize;
        const gridSnapY = Math.round(elementBounds.y / this.gridSize) * this.gridSize;

        if (Math.abs(elementBounds.x - gridSnapX) < this.snapThreshold) {
            snappedX = gridSnapX;
            hasSnapped = true;
        }
        if (Math.abs(elementBounds.y - gridSnapY) < this.snapThreshold) {
            snappedY = gridSnapY;
            hasSnapped = true;
        }

        // Snap to other elements
        this.layer.children.forEach(child => {
            if (child === element || child.getClassName() !== 'Text') return;

            const targetBounds = {
                x: child.x(),
                y: child.y(),
                width: child.width(),
                height: child.getTextHeight ? child.getTextHeight() : child.height()
            };

            // Vertical snapping
            if (Math.abs(elementBounds.x - targetBounds.x) < this.alignmentThreshold) {
                snappedX = targetBounds.x;
                hasSnapped = true;
            }

            // Horizontal snapping
            if (Math.abs(elementBounds.y - targetBounds.y) < this.alignmentThreshold) {
                snappedY = targetBounds.y;
                hasSnapped = true;
            }
        });

        if (hasSnapped) {
            element.x(snappedX);
            element.y(snappedY);
        }
    }

    toggleGuides() {
        this.guidesEnabled = !this.guidesEnabled;
        if (!this.guidesEnabled) {
            this.clearGuides();
        }
        this.showToast(this.guidesEnabled ? 'Guides enabled' : 'Guides disabled', 'info', 1500);
    }

    rgbToHex(rgb) {
        if (rgb.charAt(0) === '#') return rgb;

        const result = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(rgb);
        return result ? "#" +
            ("0" + parseInt(result[1], 10).toString(16)).slice(-2) +
            ("0" + parseInt(result[2], 10).toString(16)).slice(-2) +
            ("0" + parseInt(result[3], 10).toString(16)).slice(-2) : rgb;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ResumeBuilder();
});