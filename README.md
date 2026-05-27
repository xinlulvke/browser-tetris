# 🎮 Browser Tetris

A feature-rich Tetris game built with vanilla JavaScript, HTML5 Canvas, and CSS3. Play the classic game of Tetris directly in your browser!

**[▶️ Play Now](https://xinlulvke.github.io/browser-tetris/)** | **[📊 Repository](https://github.com/xinlulvke/browser-tetris)**

---

## 🌟 Features

### Core Gameplay
- ✅ **Classic Tetris Mechanics** - All 7 piece types (I, L, J, O, Z, S, T)
- ✅ **Progressive Difficulty** - Speed increases with each level
- ✅ **Score Multipliers** - Points scale with current level
- ✅ **Line Clear Detection** - Classic Tetris scoring (40, 100, 300, 1200 points)
- ✅ **Wall Kick Rotation** - Smart rotation with edge collision handling

### Advanced Features
- ✅ **Hold Piece Mechanic** - Store a piece for later (classic Tetris feature)
- ✅ **Next Piece Preview** - See the upcoming piece before it spawns
- ✅ **High Score Tracking** - Persistent high scores using localStorage
- ✅ **Pause & Resume** - Pause the game anytime with spacebar
- ✅ **Game Over Modal** - Shows final stats and new high score celebration
- ✅ **Sound Effects** - Audio feedback for actions (toggleable)
- ✅ **Theme Switcher** - 3 themes: Dark, Light, Neon
- ✅ **Mobile Support** - Touch controls for swipe-based gameplay
- ✅ **Responsive Design** - Plays perfectly on desktop, tablet, and mobile

---

## 🎮 How to Play

### Desktop Controls
| Action | Keys |
|--------|------|
| **Move Left** | ⬅️ Arrow Left |
| **Move Right** | ➡️ Arrow Right |
| **Soft Drop** | ⬇️ Arrow Down |
| **Rotate CCW** | Q |
| **Rotate CW** | E |
| **Hold Piece** | Z |
| **Pause/Resume** | SPACEBAR |

### Mobile Controls
- **Swipe Left/Right** - Move piece left or right
- **Button Controls** - Use on-screen buttons for pause, theme, and new game

### Game Objective
1. Arrange falling Tetris pieces to form complete horizontal lines
2. Complete lines disappear and you earn points
3. Clear 10 lines to advance to the next level
4. Game ends when pieces stack to the top
5. Try to beat your high score!

---

## 📊 Scoring System

| Lines Cleared | Base Points | Level Multiplier |
|---------------|------------|-----------------|
| 1 Line | 40 | × Current Level |
| 2 Lines | 100 | × Current Level |
| 3 Lines | 300 | × Current Level |
| 4 Lines (Tetris!) | 1200 | × Current Level |

**Example:** Clear 4 lines on level 3 = 1200 × 3 = **3600 points!**

---

## 🎨 Themes

Switch between three beautiful themes:

- **Dark Theme** 🌙 - Classic dark interface (default)
- **Light Theme** ☀️ - Clean light interface for daytime play
- **Neon Theme** ⚡ - Cyberpunk-style with glowing effects

Press the 🎨 **Theme** button to cycle through themes. Your selection is saved!

---

## 🔊 Audio & Settings

- **Sound Effects** - Toggle on/off with 🔊 **Sound** checkbox
  - Line clear: Ascending tone
  - Rotation: Short beep
  - Hold piece: Soft tone
  - Game over: Descending tone

---

## 💾 Persistent Data

The game automatically saves:
- **High Score** - Your best score ever (using browser localStorage)
- **Theme Preference** - Your selected theme choice

*Note: Data is stored locally in your browser. Clearing browser data will reset these values.*

---

## 🏗️ Project Structure

```
browser-tetris/
├── index.html          # HTML structure & styling
├── tetris.js           # Game logic & mechanics
└── README.md           # Documentation (you are here)
```

### Key Components

**tetris.js**
- Game constants and configuration (drop speed, scoring, etc.)
- Matrix and piece creation functions
- Collision detection and physics
- Rendering system (canvas drawing)
- Game logic (movement, rotation, line clearing)
- Input handling (keyboard & touch)
- Sound effects using Web Audio API
- Theme and persistence management

**index.html**
- Responsive HTML structure
- Comprehensive CSS styling with theme support
- Canvas elements for game board and previews
- UI controls (buttons, toggles)
- Game over modal and pause overlay

---

## 🚀 Getting Started

### Play Online (No Installation Required)
Simply visit: **[xinlulvke.github.io/browser-tetris/](https://xinlulvke.github.io/browser-tetris/)**

### Play Locally
1. Clone the repository:
   ```bash
   git clone https://github.com/xinlulvke/browser-tetris.git
   cd browser-tetris
   ```

2. Open `index.html` in your browser:
   ```bash
   # On macOS
   open index.html
   
   # On Windows
   start index.html
   
   # Or just drag index.html into your browser
   ```

That's it! No build tools or dependencies needed. Pure vanilla JavaScript!

---

## 📱 Browser Compatibility

- ✅ Chrome/Chromium (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ Edge (latest)
- ✅ Mobile browsers (iOS Safari, Chrome Mobile)

*Requires ES6 support and HTML5 Canvas*

---

## 🎯 Level Progression

The game gets progressively harder:

| Level | Drop Speed | Speed Increase |
|-------|-----------|-----------------|
| 1 | 1000ms | Baseline |
| 2 | 900ms | -100ms |
| 3 | 800ms | -100ms |
| 4 | 700ms | -100ms |
| ... | ... | -100ms per level |
| 10+ | 100ms | Capped (minimum) |

- **Level increases** every 10 lines cleared
- **Speed increases** by 100ms per level (minimum 100ms)
- **Score multipliers** increase with level

---

## 🐛 Known Limitations

- Sound effects use Web Audio API (may not work on some mobile browsers)
- High scores are stored locally (not synced across devices)
- Game is single-player only
- No leaderboard/online multiplayer

---

## 🛠️ Code Quality Features

The codebase includes:
- **Comprehensive JSDoc comments** - Every function is documented
- **Extracted magic numbers** - Configuration constants at the top for easy tweaking
- **Clean architecture** - Separated concerns (logic, rendering, input)
- **Modular functions** - Easy to understand and maintain
- **Best practices** - Collision detection, matrix operations, game state management

---

## 💡 Tips for High Scores

1. **Plan ahead** - Watch the "Next" preview to plan your moves
2. **Use Hold strategically** - Save pieces for critical moments
3. **Build higher** - Create gaps to maximize line clears (T-spins in advanced play)
4. **Stay calm** - Don't panic when pieces drop faster at higher levels
5. **Clear multiple lines** - 4-line clears (Tetris!) give huge point bonuses

---

## 📄 License

This project is open source and available for personal and educational use.

---

## 👨‍💻 Author

Created with ❤️ by [xinlulvke](https://github.com/xinlulvke)

---

## 🎓 Learning Resources

Interested in how this works? Check out the code comments in `tetris.js` for detailed explanations of:
- Collision detection algorithms
- Matrix rotation mathematics
- Wall kick physics
- Game state management
- Canvas rendering techniques

---

**Enjoy the game! 🎮**

Feel free to fork, modify, and create your own version!
