// Run code only after the page has fully loaded
document.addEventListener("DOMContentLoaded", () => {
  // Check if the user is logged in using session storage
  const loggedIn = sessionStorage.getItem("loggedIn");
  // Update navigation buttons based on login status
  updateNavbar(loggedIn);
  updateSections(loggedIn);

  // Show register section when register button is clicked
  document.getElementById("registerBtn").onclick = () => {
    showSection("registerSection");
    clearMessages();
  };

  // Show login section when login button is clicked
  document.getElementById("loginBtn").onclick = () => {
    showSection("loginSection");
    clearMessages();
  };

  // Show feed section and load feed posts
  document.getElementById("feedBtn").onclick = () => {
    showSection("feedSection");
    loadFeed();
    clearMessages();
  };

  // Show upload section
  document.getElementById("uploadBtn").onclick = () => {
    showSection("uploadSection");
    clearMessages();
  };

  // Show search section
  document.getElementById("searchBtn").onclick = () => {
    showSection("searchSection");
    clearMessages();
  };

  // Show profile section and load profile data
  document.getElementById("profileBtn").onclick = () => {
    loadProfileInfo();
    loadFollowingCount();
    showSection("profileSection");
  };

  // Log out from navbar logout button
  document.getElementById("logoutBtn").onclick = async () => {
    await fetch("http://localhost:8080/M01010179/login", {
      method: "DELETE",
      credentials: "include"
    });

    sessionStorage.clear();
    updateNavbar(false);
    showSection("loginSection");
  };

  // Log out from profile page logout button
  document.getElementById("logoutFromProfilePage").onclick = async () => {
    await fetch("http://localhost:8080/M01010179/login", {
      method: "DELETE",
      credentials: "include"
    });

    sessionStorage.clear();
    updateNavbar(false);
    showSection("loginSection");
  };

  // Show pet facts section and load third party data
  document.getElementById("petDataBtn").onclick = () => {
    showSection("petDataSection");
    loadPetData();
  };

});

// Update navbar buttons depending on login state
function updateNavbar(loggedIn) {
  const restricted = ["feedBtn", "uploadBtn", "searchBtn", "profileBtn", "logoutBtn", "petDataBtn"];
  const openButtons = ["registerBtn", "loginBtn"];

  //Hide buttons when not logged in
  restricted.forEach(id => {
    document.getElementById(id).classList.toggle("hidden", !loggedIn);
  });

  //Hide login and register when logged in
  openButtons.forEach(id => {
    document.getElementById(id).classList.toggle("hidden", loggedIn);
  });
}

// Show correct section on initial page load
function updateSections(loggedIn) {
  if (!loggedIn) {
    showSection("registerSection");
  } else {
    showSection("feedSection");
  }
}

// Hide all sections and show only the selected one
function showSection(id) {
  document.querySelectorAll("main section").forEach(sec => {
    sec.style.display = "none";
  });
  document.getElementById(id).style.display = "block";
}

// Clear register and login messages
function clearMessages() {
  document.getElementById("registerMsg").textContent = "";
  document.getElementById("loginMsg").textContent = "";
}

// Load profile information from the server
async function loadProfileInfo() {
  const res = await fetch("http://localhost:8080/M01010179/login", {
    credentials: "include"
  });

  const data = await res.json();

  if (!data.loggedIn) return;

  const user = data.user;

  // Display username and email
  document.getElementById("profilePageUsername").textContent = user.username;
  document.getElementById("profilePageEmail").textContent = user.email;

  const img = document.getElementById("profilePic");

  // Show profile picture or default image
  if (user.profilePic) {
    img.src = `http://localhost:8080/uploads/${user.profilePic}?t=${Date.now()}`;
  } else {
    img.src = "../image/defaultpic.webp";
  }
}

// Register a new user account
async function registerUser() {
  const username = document.getElementById("regUsername").value;
  const email = document.getElementById("regEmail").value;
  const password = document.getElementById("regPassword").value;
  const msg = document.getElementById("registerMsg");

  msg.style.color = "red";
  // Validate input fields
  if (!username || !email || !password) {
    msg.textContent = "Please fill all fields";
    return;
  }

  // Send registration request to server
  const response = await fetch("http://localhost:8080/M01010179/users", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email, password })
  });

  const result = await response.json();

  if (!result.success) {
    msg.textContent = result.message;
    return;
  }

  sessionStorage.setItem("loggedIn", true);
  sessionStorage.setItem("username", username);
  sessionStorage.setItem("email", email);
  // Show success message and redirect to login
  msg.style.color = "green";
  msg.textContent = "Registration successful! Please log in";

  setTimeout(() => {
    showSection("loginSection");
  }, 1000);
}

// Log in as an exisiting user
async function loginUser() {
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;
  const msg = document.getElementById("loginMsg");

  msg.style.color = "red";
  // Validate login fields
  if (!email || !password) {
    msg.textContent = "Please fill all fields";
    return;
  }

  const response = await fetch(`http://localhost:8080/M01010179/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });

  const result = await response.json();

  if (!result.success) {
    msg.textContent = "Invalid login";
    return;
  }

  // Save login state
  sessionStorage.setItem("loggedIn", true);
  sessionStorage.setItem("username", result.username);
  sessionStorage.setItem("email", result.email);

  msg.style.color = "green";
  msg.textContent = "Login successful!";

  updateNavbar(true);
  showSection("feedSection");
}

// Search for users by username
async function searchUsers() {
  const query = document.getElementById("searchInput").value;

  const response = await fetch(`http://localhost:8080/M01010179/users?q=${query}`, {
    credentials: "include"
  });

  const users = await response.json();
  const container = document.getElementById("searchResults");
  container.innerHTML = "";

  // shows search results
  users.forEach(u => {
    container.innerHTML += `
        <div class="user-card">
            <p><strong>${u.username}</strong></p>
            <button onclick="followUser('${u.username}', this)">Follow</button>
            <button onclick="unfollowUser('${u.username}', this)">Unfollow</button>
            <p class="followMsg"></p>
        </div>
    `;
  });
}

// Search posts by content
async function searchPosts() {
  const query = document.getElementById("postSearchInput").value;

  const response = await fetch(`http://localhost:8080/M01010179/contents?q=${query}`, {
    credentials: "include"
  });

  const posts = await response.json();
  const container = document.getElementById("postSearchResults");
  container.innerHTML = "";

  if (!posts.length) {
    container.innerHTML = "<p>No posts found.</p>";
    return;
  }

  //shows results
  posts.forEach(post => {
    container.innerHTML += `
            <div class="post">
                <p><strong>${post.user}</strong></p>
                <p>${post.text}</p>
                ${post.image ? `<img src="http://localhost:8080/uploads/${post.image}">` : ""}
            </div>
        `;
  });
}

// Follows a user
async function followUser(target, button) {
  const msgBox = button.parentElement.querySelector(".followMsg");

  const res = await fetch(`http://localhost:8080/M01010179/follow/${target}`, {
    method: "POST",
    credentials: "include"
  });

  const data = await res.json();

  msgBox.style.color = data.success ? "green" : "red";
  msgBox.textContent = data.message;

  // update following count
  if (data.success) {
    loadFollowingCount();
  }
}

// unfollows users 
async function unfollowUser(target, button) {
  const msgBox = button.parentElement.querySelector(".followMsg");

  const res = await fetch(`http://localhost:8080/M01010179/follow/${target}`, {
    method: "DELETE",
    credentials: "include"
  });

  const data = await res.json();

  msgBox.style.color = data.success ? "green" : "red";
  msgBox.textContent = data.message;

  // update following count
  if (data.success) {
    loadFollowingCount();
  }
}

// Load number of users being followed
async function loadFollowingCount() {
  const res = await fetch(
    "http://localhost:8080/M01010179/followingcount",
    { credentials: "include" }
  );

  const data = await res.json();

  document.getElementById("followingCount").textContent =
    data.success ? data.count : 0;
}

// Upload a post with text and image
async function uploadPost() {
  const text = document.getElementById("postText").value;
  const fileInput = document.getElementById("postImage");
  const file = fileInput.files[0];

  if (!text || !file) {
    document.getElementById("uploadMsg").innerText = "Text and image required";
    document.getElementById("uploadMsg").style.color = "red";
    return;
  }

  const formData = new FormData();
  formData.append("text", text);
  formData.append("image", file);

  const response = await fetch(`http://localhost:8080/M01010179/upload`, {
    method: "POST",
    credentials: "include",
    body: formData
  });

  const result = await response.json();

  document.getElementById("uploadMsg").innerText = result.message;

  if (result.success) {
    document.getElementById("uploadMsg").style.color = "green";
    document.getElementById("postText").value = "";
    document.getElementById("postImage").value = "";
  } else {
    document.getElementById("uploadMsg").style.color = "red";
  }
}

document.addEventListener("DOMContentLoaded", () => {

  const picInput = document.getElementById("profilePicInput");
  if (picInput) {
    picInput.addEventListener("change", uploadProfilePic);
  }

  // user caselect their profile pic
  async function uploadProfilePic() {
    const fileInput = document.getElementById("profilePicInput");
    const file = fileInput.files[0];

    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch("http://localhost:8080/M01010179/profilepic", {
      method: "POST",
      credentials: "include",
      body: formData
    });

    const data = await res.json();

    // saves it
    if (data.success) {
      const imgUrl = `http://localhost:8080/uploads/${data.image}?t=${Date.now()}`;

      document.getElementById("profilePic").src = imgUrl;

    }
  }
});

// Load feed posts from followed users
async function loadFeed() {
  const response = await fetch(`http://localhost:8080/M01010179/feed`, {
    credentials: "include"
  });

  const posts = await response.json();

  const feed = document.getElementById("feed");
  feed.innerHTML = "";

  if (!Array.isArray(posts)) {
    feed.innerHTML = "<p>You must be logged in to view your feed.</p>";
    return;
  }

  // display feed posts
  posts.forEach(post => {
    const profilePic = post.profilePic
      ? `http://localhost:8080/uploads/${post.profilePic}`
      : "../image/defaultpic.webp";

    feed.innerHTML += `
        <div class="post">

            <div class="post-header">
                <img class="post-pfp" src="${profilePic}">
                <span class="post-username"><strong>${post.user}</strong></span>
            </div>

            <p>${post.text}</p>

            ${post.image ? `<img src="http://localhost:8080/uploads/${post.image}">` : ""}
        </div>
    `;
  })
};

// Load third party pet data
async function loadPetData() {
  const res = await fetch("http://localhost:8080/M01010179/petdata", {
    credentials: "include"
  });

  const data = await res.json();
  const box = document.getElementById("petDataBox");

  if (!data.success) {
    box.innerHTML = `<p style="color:red">${data.message}</p>`;
    return;
  }

  box.innerHTML = `
        <div class="post">
            <h3>Pet Data</h3>
            <p><strong>Dog Fact:</strong> ${data.dogFact}</p>
            <p><strong>Cat Fact:</strong> ${data.catFact}</p>
        </div>
    `;
}


