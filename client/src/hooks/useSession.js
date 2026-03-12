import { useContext } from 'react';
import { SessionContext, ACTIONS } from '../context/SessionContext';

/**
 * Custom hook to access and update session state.
 * Provides clean helper functions instead of raw dispatch calls.
 */
const useSession = () => {
  const { state, dispatch } = useContext(SessionContext);

  const setSession = (session) =>
    dispatch({ type: ACTIONS.SET_SESSION, payload: session });

  const setCurrentQuestion = (index) =>
    dispatch({ type: ACTIONS.SET_CURRENT_QUESTION, payload: index });

  const setInterviewActive = (active) =>
    dispatch({ type: ACTIONS.SET_INTERVIEW_ACTIVE, payload: active });

  const setListening = (listening) =>
    dispatch({ type: ACTIONS.SET_LISTENING, payload: listening });

  const addScore = (score) =>
    dispatch({ type: ACTIONS.ADD_SCORE, payload: score });

  const addFillerStats = (stats) =>
    dispatch({ type: ACTIONS.ADD_FILLER_STATS, payload: stats });

  const setLoading = (loading) =>
    dispatch({ type: ACTIONS.SET_LOADING, payload: loading });

  const setError = (error) =>
    dispatch({ type: ACTIONS.SET_ERROR, payload: error });

  const resetSession = () =>
    dispatch({ type: ACTIONS.RESET_SESSION });

  return {
    ...state,
    setSession,
    setCurrentQuestion,
    setInterviewActive,
    setListening,
    addScore,
    addFillerStats,
    setLoading,
    setError,
    resetSession,
  };
};

export default useSession;
