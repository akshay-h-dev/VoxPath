import { createContext, useReducer } from 'react';

// Initial state
const initialState = {
  session: null,        // Current active session object
  currentQuestion: 0,   // Index of current question
  isInterviewActive: false,
  isListening: false,    // Is STT currently capturing
  scores: [],            // Array of score objects per answer
  fillerStats: [],       // Array of filler analysis per answer
  loading: false,
  error: null,
};

// Action types
export const ACTIONS = {
  SET_SESSION: 'SET_SESSION',
  SET_CURRENT_QUESTION: 'SET_CURRENT_QUESTION',
  SET_INTERVIEW_ACTIVE: 'SET_INTERVIEW_ACTIVE',
  SET_LISTENING: 'SET_LISTENING',
  ADD_SCORE: 'ADD_SCORE',
  ADD_FILLER_STATS: 'ADD_FILLER_STATS',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  RESET_SESSION: 'RESET_SESSION',
};

// Reducer
const sessionReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_SESSION:
      return { ...state, session: action.payload, error: null };

    case ACTIONS.SET_CURRENT_QUESTION:
      return { ...state, currentQuestion: action.payload };

    case ACTIONS.SET_INTERVIEW_ACTIVE:
      return { ...state, isInterviewActive: action.payload };

    case ACTIONS.SET_LISTENING:
      return { ...state, isListening: action.payload };

    case ACTIONS.ADD_SCORE:
      return { ...state, scores: [...state.scores, action.payload] };

    case ACTIONS.ADD_FILLER_STATS:
      return { ...state, fillerStats: [...state.fillerStats, action.payload] };

    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case ACTIONS.SET_ERROR:
      return { ...state, error: action.payload, loading: false };

    case ACTIONS.RESET_SESSION:
      return { ...initialState };

    default:
      return state;
  }
};

// Context
export const SessionContext = createContext(null);

// Provider component
export const SessionProvider = ({ children }) => {
  const [state, dispatch] = useReducer(sessionReducer, initialState);

  return (
    <SessionContext.Provider value={{ state, dispatch }}>
      {children}
    </SessionContext.Provider>
  );
};
