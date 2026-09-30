import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const app = express();
const PORT = 3000;
const JWT_SECRET = "secret-key";

app.use(cors());
app.use(express.json());

const MONGO_URL = "mongodb://localhost:27017/myapp";

mongoose
  .connect(MONGO_URL)
  .then(() => console.log("MongoDB подключена"))
  .catch((error) => console.error("Ошибка подключения к MongoDB:", error));

const User = mongoose.model("User", {
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const auth = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Нет токена" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Неверный токен" });
  }
};

app.post("/api/register", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Заполните все поля" });
  }

  const existing = await User.findOne({ email });
  if (existing) {
    return res.status(400).json({ message: "Такой email уже есть" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await User.create({ email, password: hashedPassword });

  res.json({ message: "Зарегистрирован", userId: user._id });
});

app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(400).json({ message: "Неверный email или пароль" });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(400).json({ message: "Неверный email или пароль" });
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return res.json({ message: "Вошёл", token });
});

app.get("/api/profile", auth, async (req, res) => {
  const user = await User.findById(req.userId).select("-password");
  res.json(user);
});

const Post = mongoose.model("Post", {
  title: { type: String, required: true },
  content: { type: String, required: true },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

app.get("/api/posts", async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 });
  res.json(posts);
});

app.post("/api/posts", auth, async (req, res) => {
  const { title, content } = req.body;

  if (!title || !content) {
    return res.status(400).json({ message: "Заполните все поля" });
  }

  const post = await Post.create({
    title,
    content,
    author: req.userId,
  });

  res.json({ message: "Создан", post });
});

app.put("/api/posts/:id", auth, async (req, res) => {
  const updated = await Post.findByIdAndUpdate(
    req.params.id,
    { title: req.body.title, content: req.body.content },
    { new: true }
  );

  res.json({ message: "Обновлён", post: updated });
});

app.delete("/api/posts/:id", auth, async (req, res) => {
  await Post.findByIdAndDelete(req.params.id);
  res.json({ message: "Удалён" });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});