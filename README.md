# AutoGrok - Grok Efficiency Booster 🚀

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/leksmedias/Autogrok)

**AutoGrok** is a powerful Chrome extension that supercharges your Grok (X.ai) workflow with batch automation, intelligent prompt management, automatic downloads, and advanced editing features.

## ✨ Features

### 🎯 Core Functionality

1. **Automatic Batch Sending**
   - Queue unlimited tasks
   - Auto-execute prompts sequentially
   - Configurable delays to avoid rate limiting
   - Retry failed tasks automatically

2. **Auto-Download & Auto-Rename**
   - Intelligent filename templates with variables
   - Automatic download on completion
   - Custom folder organization by date/type
   - Conflict resolution

3. **Image-to-Video Support** ⭐
   - Upload images with prompts
   - Automated video generation
   - High-volume processing
   - Free and fast

4. **Text-to-Video Support**
   - Direct prompt injection
   - Automated video creation
   - Progress monitoring

5. **Text-to-Image Support** ⭐
   - Infinite scroll generation on "Imagine" page
   - Instant results
   - Batch processing
   - Mass download capability

6. **Image-to-Image Support**
   - Single or multiple image uploads
   - Combine with custom prompts
   - Batch transformations

7. **Task Management**
   - Visual task queue
   - Drag-and-drop reordering
   - Real-time status updates
   - Add/remove tasks anytime

8. **Prompt Engineering Tools**
   - Template system with prefix/suffix
   - Variable substitution
   - Batch prompt generation
   - Template library

9. **Download Manager**
   - Complete download history
   - Batch management
   - Metadata tracking
   - Re-download capability

10. **Advanced Editing**
    - Batch AI upscaling (coming soon)
    - Batch background removal (coming soon)

## 🔥 Why AutoGrok?

Grok's advantages:
- **Video Powerhouse**: Free, high-volume, fast video generation
- **Instant Images**: Infinite scrolling with instant results
- **High Creative Freedom**: Excellent for experimentation

AutoGrok maximizes these strengths through automation!

## 📦 Installation

### From Chrome Web Store
*Coming soon*

### Manual Installation (Developer Mode)

1. Download or clone this repository:
   ```bash
   git clone https://github.com/leksmedias/Autogrok.git
   ```

2. Open Chrome and navigate to `chrome://extensions/`

3. Enable **Developer mode** (toggle in top-right)

4. Click **Load unpacked**

5. Select the `Autogrok` folder

6. The extension icon should appear in your toolbar!

## 🚀 Quick Start

1. **Visit Grok**: Navigate to [grok.x.ai](https://grok.x.ai)

2. **Open Extension**: Click the AutoGrok icon in your toolbar

3. **Add Tasks**:
   - Enter a prompt in the quick-add box
   - Select task type (text-to-image, text-to-video, etc.)
   - Click "Add Task"

4. **Start Queue**: Click "Start Queue" to begin automation

5. **Sit Back**: AutoGrok handles everything automatically!

## 📖 Usage Guide

### Creating Prompt Templates

1. Click the extension icon → **Templates**
2. Click **Add Template**
3. Set name, prefix, suffix
4. Add variables (optional)
5. Save and apply to prompts

**Example Template:**
- **Name**: Cinematic
- **Prefix**: `cinematic, dramatic lighting`
- **Suffix**: `high quality, 4k, professional`

### Batch Processing

1. Go to **Options** → **General**
2. Configure task delay and retry settings
3. In popup, add multiple prompts (one per line)
4. Select task type
5. Click "Add Tasks"
6. Start queue

### Custom Download Organization

1. Go to **Options** → **Downloads**
2. Set filename template: `{prompt}_{date}_{time}`
3. Enable organize by date/type
4. Set download path
5. Save settings

**Available Variables:**
- `{prompt}` - Task prompt (sanitized)
- `{timestamp}` - Unix timestamp
- `{date}` - YYYY-MM-DD
- `{time}` - HH-MM-SS
- `{index}` - Task index
- `{type}` - Task type
- `{id}` - Unique task ID

## ⚙️ Settings

### General
- **Auto-start queue**: Start processing when tasks are added
- **Notifications**: Desktop notifications for completions
- **Task delay**: Milliseconds between tasks (default: 1000)
- **Retry attempts**: Number of retries for failures (default: 3)
- **Retry delay**: Delay before retry (default: 2000ms)

### Downloads
- **Auto-download**: Enable/disable automatic downloads
- **Download path**: Base folder name
- **Filename template**: Custom naming pattern
- **Organize by date**: Create date subfolders
- **Organize by type**: Create type subfolders (image/video)
- **Image format**: PNG, JPG, WebP
- **Video format**: MP4, WebM

### Advanced
- **Max prompt length**: Character limit for prompts
- **Export/Import settings**: Backup your configuration
- **Reset**: Restore default settings

## 🎨 Use Cases

### 1. Marketing Content Creation
Generate 100+ product images with variations:
```
Template: "professional product photo"
Variables: {angle} = [front, side, top]
         {lighting} = [soft, dramatic, natural]
Result: 9 unique combinations
```

### 2. Storyboard Generation
Create video storyboards automatically:
```
Prompts: Scene 1, Scene 2, Scene 3...
Type: Text-to-Image
Auto-download with sequential naming
```

### 3. A/B Testing Visuals
Generate multiple style variations:
```
Base: "modern website hero image"
Suffixes: minimalist, colorful, dark mode, light mode
Batch process all variants
```

### 4. Video Production
Batch create video clips from image sequences:
```
Upload image sequence
Add transition prompts
Type: Image-to-Video
Auto-download all results
```

## 🛠️ Technical Details

### Architecture
- **Manifest V3** Chrome Extension
- **Service Worker** for background processing
- **Content Scripts** for DOM manipulation
- **Chrome Storage API** for data persistence
- **Chrome Downloads API** for file management

### File Structure
```
autogrok/
├── manifest.json          # Extension configuration
├── background/
│   ├── service-worker.js  # Main orchestrator
│   ├── task-queue.js      # Queue management
│   ├── download-manager.js # Download handling
│   └── storage-manager.js # Data persistence
├── content/
│   ├── content-script.js  # Grok page automation
│   └── styles.css         # Injected styles
├── popup/                 # Quick access UI
├── options/               # Settings page
├── shared/                # Utilities & constants
└── assets/                # Icons & images
```

### Grok Interface Compatibility

The extension uses intelligent selectors to work with Grok's interface. If Grok updates their UI, the extension may need updates.

**Supported Selectors** (auto-detected):
- Prompt input fields
- Generate buttons
- Image upload inputs
- Result containers
- Progress indicators
- Download buttons

## 🔒 Privacy & Security

- **No external servers**: All processing is local
- **No data collection**: We don't track or store your data externally
- **No analytics**: Your usage is completely private
- **Open source**: Audit the code yourself
- **Minimal permissions**: Only requests necessary permissions

### Required Permissions
- `storage`: Save settings and task queue
- `downloads`: Auto-download generated content
- `activeTab`: Interact with Grok pages
- `scripting`: Inject automation scripts
- `tabs`: Manage Grok tabs

## 🐛 Troubleshooting

### Queue not starting
- Ensure you're on a Grok page (grok.x.ai)
- Check if tasks are in "pending" status
- Verify settings → auto-start is configured

### Downloads not working
- Check Settings → Downloads → Auto-download is enabled
- Verify Chrome has download permissions
- Check Chrome's download settings

### Generation fails
- Increase task delay (Settings → General → Task delay)
- Check Grok interface for errors
- Verify prompt is within character limit

### Extension not appearing
- Reload extension: `chrome://extensions/`
- Check Developer mode is enabled
- Try restarting Chrome

## 🗺️ Roadmap

### Phase 1 (Current - MVP)
- [x] Basic task queue
- [x] Auto-send functionality
- [x] Download manager
- [x] Popup UI
- [x] Settings page

### Phase 2 (In Progress)
- [ ] Advanced prompt templates
- [ ] Variable system
- [ ] Task manager UI
- [ ] Infinite scroll support

### Phase 3 (Planned)
- [ ] AI upscaling integration
- [ ] Background removal
- [ ] Batch editing tools
- [ ] Export/import tasks

### Phase 4 (Future)
- [ ] Cloud sync
- [ ] Team collaboration
- [ ] API integration
- [ ] Analytics dashboard

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

### Development Setup

1. Clone repository
2. Make changes
3. Test in Chrome (Developer mode)
4. Submit PR

### Guidelines
- Follow existing code style
- Test thoroughly before submitting
- Update documentation for new features
- Keep commits atomic and descriptive

## 📄 License

MIT License - see [LICENSE](LICENSE) file

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/leksmedias/Autogrok/issues)
- **Discussions**: [GitHub Discussions](https://github.com/leksmedias/Autogrok/discussions)

## 🌟 Acknowledgments

- Built for the Grok community
- Inspired by efficiency-focused creators
- Powered by Chrome Extensions API

---

**Made with ❤️ for Grok users**

*Boost your creativity, automate the rest!*
