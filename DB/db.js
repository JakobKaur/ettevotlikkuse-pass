(function () {
  const KEY = "ep_db_v1";
  const CURRENT_USER_KEY = "ep_current_user_id";

  const CATEGORIES = [
    "Kogemused / Projektitegevused",
    "Koolitused / Laagrid",
    "Erasmus+ / Rahvusvahelised tegevused",
    "Heategevused / Vabatahtlikud tööd",
    "Eneseareng"
  ];

  function uid(prefix) {
    return prefix + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }

  function nowIso() {
    return new Date().toISOString();
  }

  function readDB() {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const seed = createSeedDB();
      writeDB(seed);
      return seed;
    }
    try {
      const parsed = JSON.parse(raw);
      if (!parsed.users || !parsed.experiences) {
        const seed = createSeedDB();
        writeDB(seed);
        return seed;
      }
      return parsed;
    } catch (e) {
      const seed = createSeedDB();
      writeDB(seed);
      return seed;
    }
  }

  function writeDB(db) {
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function createSeedDB() {
    const createdAt = nowIso();
    return {
      users: [
        {
          id: "admin_1",
          fullName: "Admin Kasutaja",
          age: 30,
          email: "admin@pass.ee",
          password: "admin12345",
          phone: "",
          role: "admin",
          verified: true,
          createdAt
        }
      ],
      experiences: []
    };
  }

  function getUsers() {
    return readDB().users;
  }

  function setUsers(users) {
    const db = readDB();
    db.users = users;
    writeDB(db);
  }

  function getExperiences() {
    return readDB().experiences;
  }

  function setExperiences(experiences) {
    const db = readDB();
    db.experiences = experiences;
    writeDB(db);
  }

  function findUserById(userId) {
    return getUsers().find((u) => u.id === userId) || null;
  }

  function getCurrentUser() {
    const id = localStorage.getItem(CURRENT_USER_KEY);
    if (!id) return null;
    return findUserById(id);
  }

  function register(payload) {
    const fullName = String(payload.fullName || "").trim();
    const age = Number(payload.age);
    const email = String(payload.email || "").trim().toLowerCase();
    const password = String(payload.password || "");
    const phone = String(payload.phone || "").trim();

    if (!fullName || !email || !password) {
      return { ok: false, error: "Palun täitke kõik kohustuslikud väljad." };
    }
    if (password.length < 8) {
      return { ok: false, error: "Parool peab olema vähemalt 8 tähemärki." };
    }
    if (getUsers().some((u) => u.email.toLowerCase() === email)) {
      return { ok: false, error: "Selle emailiga konto on juba olemas." };
    }

    const user = {
      id: uid("usr"),
      fullName,
      age: Number.isFinite(age) ? age : null,
      email,
      password,
      phone,
      role: "student",
      verified: true,
      createdAt: nowIso()
    };
    const users = getUsers();
    users.push(user);
    setUsers(users);
    return { ok: true, user };
  }

  function login(email, password) {
    const normalizedEmail = String(email || "").trim().toLowerCase();
    const pwd = String(password || "");
    const user = getUsers().find(
      (u) => u.email.toLowerCase() === normalizedEmail && u.password === pwd
    );
    if (!user) {
      return { ok: false, error: "Vale email või parool." };
    }
    localStorage.setItem(CURRENT_USER_KEY, user.id);
    return { ok: true, user };
  }

  function logout() {
    localStorage.removeItem(CURRENT_USER_KEY);
  }

  function requireAuth(role) {
    const user = getCurrentUser();
    if (!user) {
      window.location.href = "sisselogimine.html";
      return null;
    }
    if (role && user.role !== role) {
      window.location.href = user.role === "admin" ? "admin.html" : "dashboard.html";
      return null;
    }
    return user;
  }

  function updateUser(userId, fields) {
    const users = getUsers();
    const idx = users.findIndex((u) => u.id === userId);
    if (idx === -1) return { ok: false, error: "Kasutajat ei leitud." };

    const nextEmail = String(fields.email || "").trim().toLowerCase();
    if (!nextEmail) return { ok: false, error: "Email on kohustuslik." };
    if (users.some((u, i) => i !== idx && u.email.toLowerCase() === nextEmail)) {
      return { ok: false, error: "See email on juba kasutusel." };
    }

    const next = { ...users[idx] };
    next.fullName = String(fields.fullName || "").trim();
    next.age = Number.isFinite(Number(fields.age)) ? Number(fields.age) : null;
    next.email = nextEmail;
    next.phone = String(fields.phone || "").trim();
    if (fields.password) {
      const pwd = String(fields.password);
      if (pwd.length < 8) return { ok: false, error: "Parool peab olema vähemalt 8 tähemärki." };
      next.password = pwd;
    }

    users[idx] = next;
    setUsers(users);
    return { ok: true, user: next };
  }

  function addExperience(payload) {
    const category = String(payload.category || "").trim();
    const title = String(payload.title || "").trim();
    const description = String(payload.description || "").trim();
    if (!category || !title || !description) {
      return { ok: false, error: "Palun täitke kohustuslikud väljad." };
    }
    const exp = {
      id: uid("exp"),
      userId: String(payload.userId || ""),
      category,
      title,
      organisation: String(payload.organisation || "").trim(),
      date: String(payload.date || "").trim(),
      hours: Number.isFinite(Number(payload.hours)) ? Number(payload.hours) : 0,
      description,
      status: "pending",
      reviewNote: "",
      submittedAt: nowIso()
    };
    const experiences = getExperiences();
    experiences.push(exp);
    setExperiences(experiences);
    return { ok: true, experience: exp };
  }

  function reviewExperience(expId, status, reviewNote) {
    const experiences = getExperiences();
    const idx = experiences.findIndex((e) => e.id === expId);
    if (idx === -1) return { ok: false, error: "Kogemust ei leitud." };
    if (!["approved", "rejected", "pending"].includes(status)) {
      return { ok: false, error: "Vigane staatus." };
    }
    experiences[idx] = {
      ...experiences[idx],
      status,
      reviewNote: String(reviewNote || "").trim()
    };
    setExperiences(experiences);
    return { ok: true };
  }

  function getUserExperiences(userId) {
    return getExperiences().filter((e) => e.userId === userId);
  }

  function verifyEmail() {
    return { ok: false, error: "Emaili kinnitus on eemaldatud." };
  }

  function getHomeLink() {
    const user = getCurrentUser();
    return user ? "dashboard.html" : "esileht.html";
  }

  window.DB = {
    CATEGORIES,
    getUsers,
    getExperiences,
    getUserExperiences,
    findUserById,
    getCurrentUser,
    register,
    login,
    logout,
    requireAuth,
    updateUser,
    addExperience,
    reviewExperience,
    verifyEmail,
    getHomeLink
  };
})();