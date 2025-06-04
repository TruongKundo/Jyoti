/* Flashcard Game App – With Score, Timer, and Gem Animation (React + Firebase + Tailwind) */
/* File: src/App.tsx */

import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'YOUR_AUTH_DOMAIN',
  projectId: 'YOUR_PROJECT_ID',
  storageBucket: 'YOUR_STORAGE_BUCKET',
  messagingSenderId: 'YOUR_MESSAGING_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

const ROWS = 6;
const COLS = 6;
const COLORS = ['bg-red-300', 'bg-green-300', 'bg-yellow-300', 'bg-blue-300', 'bg-purple-300'];

function generateGrid() {
  return Array.from({ length: ROWS }, () =>
    Array.from({ length: COLS }, () => COLORS[Math.floor(Math.random() * COLORS.length)])
  );
}

export default function FlashcardApp() {
  const [index, setIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [mode, setMode] = useState<'card' | 'memorize' | 'game'>('card');
  const [user, setUser] = useState<any>(null);
  const [flashcards, setFlashcards] = useState<any[]>([]);
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');
  const [grid, setGrid] = useState(generateGrid());
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [timeLeft, setTimeLeft] = useState(60);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) loadFlashcards(currentUser.uid);
    });
  }, []);

  useEffect(() => {
    if (mode === 'game') {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            alert('⏰ Time is up!');
            return 60;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [mode]);

  const loadFlashcards = async (uid: string) => {
    const q = query(collection(db, 'flashcards'), where('uid', '==', uid));
    const querySnapshot = await getDocs(q);
    const cards = querySnapshot.docs.map((doc) => doc.data());
    setFlashcards(cards);
  };

  const addFlashcard = async () => {
    if (!newFront || !newBack || !user) return;
    await addDoc(collection(db, 'flashcards'), {
      uid: user.uid,
      front: newFront,
      back: newBack,
    });
    setNewFront('');
    setNewBack('');
    loadFlashcards(user.uid);
  };

  const next = () => {
    setIndex((prev) => (prev + 1) % flashcards.length);
    setShowBack(false);
  };

  const login = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch {
      alert('Login failed');
    }
  };

  const logout = async () => await signOut(auth);

  const renderGame = () => (
    <div className="flex flex-col items-center">
      <h2 className="text-xl font-bold mb-2">Jewels of Wisdom – Match-3</h2>
      <p className="mb-1">🎯 Score: {score} | 🔁 Level: {level} | ⏱ Time Left: {timeLeft}s</p>
      <div className="grid grid-cols-6 gap-1 mb-4 transition-all duration-300">
        {grid.flatMap((row, rIdx) =>
          row.map((color, cIdx) => (
            <div
              key={`${rIdx}-${cIdx}`}
              className={`w-10 h-10 ${color} rounded-md shadow-inner transition duration-300 transform`}
            ></div>
          ))
        )}
      </div>
      <div className="text-center mb-2 text-lg font-semibold">
        {flashcards[index]?.front}
      </div>
      <input
        className="p-2 border rounded w-full max-w-xs"
        placeholder="Your Answer..."
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            const ans = flashcards[index]?.back.toLowerCase();
            if ((e.target as HTMLInputElement).value.toLowerCase() === ans) {
              const newGrid = [...grid];
              const r = Math.floor(Math.random() * ROWS);
              const c = Math.floor(Math.random() * COLS);
              newGrid[r][c] = 'bg-white';
              setGrid(newGrid);
              setScore(score + 10);
              if ((score + 10) % 100 === 0) setLevel(level + 1);
              next();
            } else {
              alert('Try again!');
            }
            (e.target as HTMLInputElement).value = '';
          }
        }}
      />
    </div>
  );

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-rose-100 to-teal-100">
        <h1 className="text-2xl font-bold mb-4">Welcome to Flashcard App</h1>
        <button
          onClick={login}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700"
        >
          Sign in with Google
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-tr from-rose-100 to-teal-100 p-4">
      <div className="absolute top-4 right-4">
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600"
        >
          Sign Out
        </button>
      </div>

      <div className="mb-6">
        <input
          className="p-2 m-1 border rounded"
          placeholder="Front"
          value={newFront}
          onChange={(e) => setNewFront(e.target.value)}
        />
        <input
          className="p-2 m-1 border rounded"
          placeholder="Back"
          value={newBack}
          onChange={(e) => setNewBack(e.target.value)}
        />
        <button
          onClick={addFlashcard}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          Add
        </button>
      </div>

      <div className="mb-4 flex space-x-2">
        <button onClick={() => setMode('card')} className="px-3 py-2 bg-white border rounded-xl">Card</button>
        <button onClick={() => setMode('memorize')} className="px-3 py-2 bg-white border rounded-xl">Memorize</button>
        <button onClick={() => setMode('game')} className="px-3 py-2 bg-purple-500 text-white rounded-xl">Game</button>
      </div>

      {mode === 'game' && flashcards.length > 0 && renderGame()}
    </div>
  );
}
