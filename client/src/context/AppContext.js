import React, { createContext, useContext, useState } from 'react'

const AppContext = createContext()

export const AppProvider = ({ children }) => {
  const [todayPlan, setTodayPlan] = useState(null)
  const [todayTasks, setTodayTasks] = useState([])
  const [planDate, setPlanDate] = useState(null)

  return (
    <AppContext.Provider value={{
      todayPlan, setTodayPlan,
      todayTasks, setTodayTasks,
      planDate, setPlanDate
    }}>
      {children}
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)