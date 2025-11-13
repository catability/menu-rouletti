import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth"
import { auth, provider, db } from "./firebase.js"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useEffect, useState } from "react"
import LoginPage from "./LoginPage.jsx"
import MainApp from "./MainApp.jsx"

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      console.log("인증 상태 변경됨:", currentUser)
      setUser(currentUser)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const handleLogin = async () => {
    try {
      const result = await signInWithPopup(auth, provider)
      const user = result.user
      console.log("로그인 성공!", user)

      const userRef = doc(db, "Users", user.uid)
      const userSnap = await getDoc(userRef)

      if (!userSnap.exists()) {
        await setDoc(doc(db, "Users", user.uid), {
          uid: user.uid,
          email: user.email,
          name: user.displayName
        })
        console.log("신규 회원입니다. DB에 저장합니다.");
      } else {
        console.log("이미 등록된 회원입니다.")
      }
    } catch (error) {
      console.error("로그인 실패...", error)
    }
  }

  const handleLogout = () => {
    signOut(auth)
  }

  if (isLoading) {
    // return <div>로딩 중...</div>
    return <></>
  }

  if (!user) {
    return <LoginPage onGoogleLogin={handleLogin} />
  }

  return <MainApp onLogout={handleLogout} />
}

export default App
