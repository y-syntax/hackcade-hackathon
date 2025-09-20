const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

// Load images
const playerImage = new Image();
playerImage.src = "man.png"; // Player sprite

const bgImage = new Image();
bgImage.src = "background.jpg"; // Background image

// Load custom obstacle images
const obstacleImages = [];
const obstacleCount = 3;
for (let i = 1; i <= obstacleCount; i++) {
  let img = new Image();
  img.src = `obs${i}.png`;
  obstacleImages.push(img);
}

// Background music setup
const bgMusic = new Audio("song.mp3");
bgMusic.loop = true;
bgMusic.volume = 0.5;
bgMusic.play().catch(e => {
  console.log("Background music play blocked until user interaction.");
});

function startBgMusic() {
  bgMusic.play().catch(() => {});
  document.removeEventListener("keydown", startBgMusic);
  document.removeEventListener("click", startBgMusic);
}
document.addEventListener("keydown", startBgMusic);
document.addEventListener("click", startBgMusic);

// Optional mute/unmute with M key
let isMuted = false;
document.addEventListener("keydown", e => {
  if (e.code === "KeyM") {
    isMuted = !isMuted;
    bgMusic.muted = isMuted;
  }
});

// Game variables
let box = {
  x: 50,
  y: 0,
  width: 40,
  height: 40,
  dy: 0,
  jumping: false
};
let gravity = 0.8;
let jumpPower = -12;
let obstacles = [];
let obstacleSpeed = 5; // initial speed
let gameOver = false;
let flipped = false;
let score = 0;
let canMove = true;

// Terrain variables
let terrain = [];
const segmentWidth = 80;
const maxHillHeight = 100;

// Background scrolling
let bgX = 0;
const bgSpeed = 1;

// Initialize terrain and box position
function initTerrainAndBox() {
  terrain = [];
  for (let i = 0; i < canvas.width / segmentWidth + 5; i++) {
    let height = Math.random() > 0.5 ? Math.random() * maxHillHeight : 0;
    terrain.push({ x: i * segmentWidth, width: segmentWidth, height: height });
  }
  box.y = flipped ? 0 : canvas.height - box.height;
  box.dy = 0;
  box.jumping = false;
}
initTerrainAndBox();

// Spawn obstacles regularly with random type
setInterval(() => {
  if (!gameOver) {
    const obstacleOffsetY = 20; // move obstacles up by 20 pixels
    const topY = flipped ? 0 + obstacleOffsetY : canvas.height - 30 - obstacleOffsetY;
    const obsType = Math.floor(Math.random() * obstacleCount);
    obstacles.push({
      x: canvas.width,
      y: topY,
      width: 45,
      height: 70,
      type: obsType
    });
  }
}, 2000);

// Key controls
document.addEventListener("keydown", e => {
  if (gameOver) {
    if (e.code === "Enter") resetGame();
    return;
  }

  if (e.code === "Space") {
    if (!box.jumping) {
      box.dy = flipped ? -jumpPower : jumpPower;
      box.jumping = true;
    }
  }

  if (e.code === "KeyF") {
    flipped = !flipped;
    gravity *= -1;
    box.dy = 0;
    canvas.style.transform = flipped ? "rotateX(180deg)" : "rotateX(0deg)";

    // Flip and recalc terrain heights correctly
    terrain.forEach(seg => (seg.height = canvas.height - seg.height));

    // Reset box position after flip
    box.y = flipped ? 0 : canvas.height - box.height;
    box.jumping = false;
    canMove = true;
  }
});

// Reset game function
function resetGame() {
  obstacles = [];
  score = 0;
  obstacleSpeed = 5; // reset speed
  initTerrainAndBox();
  gameOver = false;
  canMove = true;
  bgX = 0; // Reset background

  bgMusic.loop = true;
  bgMusic.play().catch(() => {});
}

// Generate new terrain segments at right
function generateTerrain() {
  const last = terrain[terrain.length - 1];
  let newX = last.x + last.width;
  let height = Math.random() > 0.5 ? Math.random() * maxHillHeight : 0;
  terrain.push({ x: newX, width: segmentWidth, height: height });
}

// Check if player is blocked by higher terrain ahead
function checkMovementPermission() {
  for (let seg of terrain) {
    if (box.x + box.width >= seg.x && box.x + box.width <= seg.x + seg.width) {
      if (!flipped) {
        let groundY = canvas.height - seg.height;
        if (box.y + box.height > groundY) {
          return false;
        }
      } else {
        let groundY = seg.height;
        if (box.y < groundY) {
          return false;
        }
      }
    }
  }
  return true;
}

// Main game loop
function gameLoop() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (!gameOver) {
    // Draw background with parallax scroll
    bgX -= bgSpeed;
    if (bgX <= -bgImage.width) bgX = 0;
    ctx.drawImage(bgImage, bgX, 0, bgImage.width, canvas.height);
    ctx.drawImage(bgImage, bgX + bgImage.width, 0, bgImage.width, canvas.height);

    // Determine if box can move forward
    canMove = checkMovementPermission();

    // Move terrain and obstacles only if canMove
    if (canMove) {
      terrain.forEach(seg => (seg.x -= obstacleSpeed));
      obstacles.forEach(obs => (obs.x -= obstacleSpeed));
    }

    // Remove off-screen terrain and generate new
    if (terrain.length && terrain[0].x + terrain[0].width < 0) terrain.shift();
    while (terrain.length < canvas.width / segmentWidth + 5) generateTerrain();

    obstacles = obstacles.filter(obs => obs.x + obs.width > 0);

    // Update box position with gravity
    box.y += box.dy;
    box.dy += gravity;

    // Check collision with current terrain segment
    terrain.forEach(seg => {
      if (box.x + box.width > seg.x && box.x < seg.x + seg.width) {
        const groundY = flipped ? seg.height : canvas.height - seg.height;
        if (!flipped && box.y + box.height >= groundY) {
          box.y = groundY - box.height;
          box.dy = 0;
          box.jumping = false;
        }
        if (flipped && box.y <= groundY) {
          box.y = groundY;
          box.dy = 0;
          box.jumping = false;
        }
      }
    });

    // Draw terrain
    ctx.fillStyle = "#228B22";
    terrain.forEach(seg => {
      const y = flipped ? 0 : canvas.height - seg.height;
      ctx.fillRect(seg.x, y, seg.width, seg.height);
    });

    // Draw player sprite upright even when canvas flipped
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    ctx.save();

    if (flipped) {
      // Counter flip vertically around player center
      ctx.translate(centerX, centerY);
      ctx.scale(1, -1);
      ctx.translate(-centerX, -centerY);
    }

    if (playerImage.complete) {
      ctx.drawImage(playerImage, box.x, box.y, box.width, box.height);
    } else {
      ctx.fillStyle = "#4477ff";
      ctx.fillRect(box.x, box.y, box.width, box.height);
    }

    ctx.restore();

    // Draw obstacles and check collision
    for (let obs of obstacles) {
      const img = obstacleImages[obs.type];
      if (img.complete) {
        ctx.drawImage(img, obs.x, obs.y, obs.width, obs.height);
      } else {
        ctx.fillStyle = "#8B4513";
        ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
      }

      if (
        box.x < obs.x + obs.width &&
        box.x + box.width > obs.x &&
        box.y < obs.y + obs.height &&
        box.y + box.height > obs.y
      ) {
        gameOver = true;
      }
    }

    // Update score only if moving
    if (canMove) {
      score++;
    }

    // Speed up every 200 points
    if (score % 200 === 0 && score !== 0) {
      obstacleSpeed += 0.5;
    }

    document.getElementById("scoreDisplay").textContent = "Score: " + score;

    // End game if box reaches right edge
    if (box.x + box.width >= canvas.width) {
      gameOver = true;
    }
  } else {
    if (!bgMusic.paused) {
      bgMusic.pause();
      bgMusic.currentTime = 0;
    }
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.font = "30px Arial";
    ctx.textAlign = "center";
    ctx.fillText("Game Over!", canvas.width / 2, canvas.height / 2 - 20);
    ctx.font = "20px Arial";
    ctx.fillText("Press ENTER to Play Again", canvas.width / 2, canvas.height / 2 + 20);
    ctx.fillText("Score: " + score, canvas.width / 2, canvas.height / 2 + 50);
  }

  requestAnimationFrame(gameLoop);
}

gameLoop();
