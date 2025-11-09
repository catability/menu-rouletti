import { onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth"
import { auth, provider, db } from "./firebase.js"
import { doc, getDoc, setDoc } from "firebase/firestore"
import { useEffect, useState } from "react"
import MapContainer from "./MapContainer.jsx"
import MyList from "./MyList.jsx"
import Roulette from "./Roulette.jsx"

function App() {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [currentTab, setCurrentTab] = useState("home")
  
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
    // return <div>잠시만 기다려 주세요... (로딩 중)</div>
    return <></>
  }

  return (
    <div>
      {user ? (
        <>
          {/* 상단 네비게이션 바 */}
          <header style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#eee' }}>
            <div>
              <button onClick={() => setCurrentTab("home")}>지도 홈</button>
              <button onClick={() => setCurrentTab("mylist")}>My List</button>
              <button onClick={() => setCurrentTab("roulette")}>룰렛</button>
            </div>
            <div>
              <span>{user.displayName}님</span>
              <button onClick={handleLogout}>로그아웃</button>
            </div>
          </header>

          {/* 탭에 따른 화면 표시 */}
          <main>
            {currentTab === "home" && <MapContainer />}
            {currentTab === "mylist" && <MyList />}
            {currentTab === "roulette" && <Roulette />}
          </main>
        </>
      ) : (
        <div>
          <h2>로그인이 필요합니다.</h2>
          <div style={{ textAlign: "center", marginTop: "50px" }}>
            <h1>룰렛</h1>
            <button onClick={handleLogin} style={{ padding: "10px 20px", fontSize: "16px" }}>google로 로그인</button>
          </div>
        </div>
        // <Login />
      )}
    </div>
  )
}

export default App
