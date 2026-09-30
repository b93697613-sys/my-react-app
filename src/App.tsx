import { useEffect, useState } from "react";

interface User {
  _id: string;
  email: string;
}

interface Post {
  _id: string;
  title: string;
  content: string;
}

const API_URL = "http://localhost:3000/api";

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");

  useEffect(() => {
    const savedToken = localStorage.getItem("token");
    if (savedToken) {
      setToken(savedToken);
    }
  }, []);

  const request = async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || "Ошибка запроса");
    }

    return data;
  };

  const register = async () => {
    try {
      const data = await request(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      setMessage(data.message || "Успешно зарегистрированы");
      setEmail("");
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка регистрации");
    }
  };

  const login = async () => {
    try {
      const data = await request(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      setMessage(data.message || "Успешный вход");
      setEmail("");
      setPassword("");

      if (data.token) {
        setToken(data.token);
        localStorage.setItem("token", data.token);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ошибка входа");
    }
  };

  const logout = () => {
    setToken(null);
    setProfile(null);
    localStorage.removeItem("token");
    setMessage("Вы вышли из системы");
  };

  const getProfile = async () => {
    if (!token) return;

    try {
      const data = await request(`${API_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProfile(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось получить профиль");
    }
  };

  const getPosts = async () => {
    try {
      const data = await request(`${API_URL}/posts`);
      setPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось загрузить посты");
    }
  };

  useEffect(() => {
    getPosts();
  }, []);

  const addPost = async () => {
    if (!token) {
      setMessage("Сначала войдите в аккаунт");
      return;
    }

    if (!title.trim() || !content.trim()) {
      setMessage("Заполните заголовок и текст поста");
      return;
    }

    try {
      await request(`${API_URL}/posts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, content }),
      });

      setTitle("");
      setContent("");
      setMessage("Пост создан");
      await getPosts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось создать пост");
    }
  };

  const deletePost = async (id: string) => {
    if (!token) return;

    try {
      await request(`${API_URL}/posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      await getPosts();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Не удалось удалить пост");
    }
  };

  return (
    <div className="app-shell">
      <div className="app-card">
        <header className="app-header">
          <div>
            <p className="eyebrow">Dashboard</p>
            <h1>React + Express</h1>
          </div>
          {token && (
            <button className="secondary-button" onClick={logout}>
              Выйти
            </button>
          )}
        </header>

        {token ? (
          <div className="stack">
            <div className="toolbar">
              <button className="primary-button" onClick={getProfile}>
                Профиль
              </button>
            </div>

            {profile && (
              <div className="profile-card">
                <span>Профиль</span>
                <strong>{profile.email}</strong>
              </div>
            )}

            <section className="panel">
              <h2>Создать пост</h2>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Заголовок"
              />
              <textarea
                value={content}
                onChange={(event) => setContent(event.target.value)}
                placeholder="Текст поста"
                rows={5}
              />
              <button className="primary-button" onClick={addPost}>
                Создать пост
              </button>
            </section>

            <section className="panel">
              <h2>Посты</h2>
              <ul className="posts-list">
                {posts.length > 0 ? (
                  posts.map((post) => (
                    <li key={post._id} className="post-item">
                      <div>
                        <strong>{post.title}</strong>
                        <p>{post.content}</p>
                      </div>
                      <button
                        className="icon-button"
                        onClick={() => deletePost(post._id)}
                        aria-label={`Удалить пост ${post.title}`}
                      >
                        ❌
                      </button>
                    </li>
                  ))
                ) : (
                  <li className="empty-state">Постов пока нет</li>
                )}
              </ul>
            </section>
          </div>
        ) : (
          <div className="auth-card">
            <div className="field-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
              />
            </div>

            <div className="field-group">
              <label htmlFor="password">Пароль</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Введите пароль"
              />
            </div>

            <div className="auth-actions">
              <button className="primary-button" onClick={register}>
                Зарегистрироваться
              </button>
              <button className="secondary-button" onClick={login}>
                Войти
              </button>
            </div>
          </div>
        )}

        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
}