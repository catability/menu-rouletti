import { useEffect, useState } from "react"
import { auth, db } from "./firebase"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"

function Roulette() {
    const [userTags, setUserTags] = useState([])
    const [selectedTag, setSelectedTag] = useState("")
    const [candidateMenus, setCandidateMenus] = useState([])
    const [winningMenu, setWinningMenu] = useState("")
    const [winningShops, setWinningShops] = useState([])

    useEffect(() => {
        const fetchUserTags = async () => {
            if (!auth.currentUser) return
            const userSnap = await getDoc(doc(db, "Users", auth.currentUser.uid))
            if (userSnap.exists() && userSnap.data().tags) {
                setUserTags(userSnap.data().tags)
            }
        }
        fetchUserTags()
    }, [])

    useEffect(() => {
        const fetchWinningShops = async () => {
            if (!winningMenu || !auth.currentUser) return

            const q = query(
                collection(db, "MyMenuList"),
                where("user_id", "==", auth.currentUser.uid),
                where("location_tag", "==", selectedTag),
                where("menu_name", "==", winningMenu)
            )
            const querySnapshot = await getDocs(q)

            const shops = []
            for (const docSnapshot of querySnapshot.docs) {
                const shopId = docSnapshot.data().shop_id
                const shopSnap = await getDoc(doc(db, "Shops", shopId))
                if (shopSnap.exists()) {
                    shops.push(shopSnap.data())
                }
            }

            setWinningShops(shops)
        }
        
        fetchWinningShops()
    }, [winningMenu])

    const handleTagSelect = async (tag) => {
        setSelectedTag(tag)
        setWinningMenu(null)

        if (!auth.currentUser) return

        const q = query(
            collection(db, "MyMenuList"),
            where("user_id", "==", auth.currentUser.uid),
            where("location_tag", "==", tag)
        )
        const querySnapshot = await getDocs(q)

        const menuSet = new Set()
        querySnapshot.forEach((doc) => {
            menuSet.add(doc.data().menu_name)
        })

        const menus = [...menuSet]
        console.log(`'${tag}' 거점의 후보 메뉴들:`, menus)
        setCandidateMenus(menus)
    }

    const handleSpinRoulette = () => {
        if (candidateMenus.length === 0) {
            alert("이 거점에는 저장된 메뉴가 없습니다!")
            return
        }

        const randomIndex = Math.floor(Math.random() * candidateMenus.length)
        const winner = candidateMenus[randomIndex]
        setWinningMenu(winner)
    }

    return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
            <h2>오늘 뭐 먹지?</h2>

            {/* 1. 거점 선택 영역 */}
            <div style={{ margin: '20px 0' }}>
                <p>먼저 거점을 선택해주세요.</p>
                <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {userTags.map((tag, index) => (
                        <button
                            key={index}
                            onClick={() => handleTagSelect(tag)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '20px',
                                border: '1px solid #007bff',
                                background: selectedTag === tag ? '#007fbb' : 'white',
                                color: selectedTag === tag ? 'white' : '#007bff',
                                cursor: 'pointer'
                            }}
                        >
                            #{tag}
                        </button>
                    ))}
                </div>
            </div>

            {/* 2. 룰렛 돌리기 버튼 */}
            {selectedTag && (
                <div style={{ margin: '40px 0' }}>
                    <button
                        onClick={handleSpinRoulette}
                        disabled={candidateMenus.length === 0}
                        style={{
                            padding: '15px 40px',
                            fontSize: '24px',
                            fontWeight: 'bold',
                            background: candidateMenus.length === 0 ? '#ccc' : '#ff4757',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50px',
                            cursor: candidateMenus.length === 0 ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 15px rgba(255, 71, 87, 0.3)'
                        }}
                    >
                        룰렛 START!
                    </button>
                </div>
            )}

            {/* 3. 결과 보여주기 */}
            {winningMenu && (
                <div style={{ marginTop: '30px', animation: 'popIn 0.5s ease-out' }}>
                    <h3>오늘의 메뉴는...</h3>
                    <h1 style={{ fontSize: '48px', color: '#2ed573', margin: '10px 0' }}>
                        🎉 {winningMenu} 🎉
                    </h1>
                </div>
            )}

            {/* 4. 당첨 메뉴 가게 리스트 */}
            {winningMenu && winningShops.length > 0 && (
                <div style={{ marginTop: '30px', textAlign: 'left', background: '#f9f9f9', padding: '20px', borderRadius: '15px' }}>
                    <h4 style={{ margin: '0 0 15px 0' }}>여기로 가시면 됩니다!</h4>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {winningShops.map((shop, index) => (
                            <li key={index} style={{ padding: '10px', borderBottom: '1px solid #eee', background: 'white', marginBottom: '10px', borderRadius: '8px' }}>
                                <strong style={{ fontSize: '18px' }}>{shop.name}</strong>
                                <p style={{ margin: '5px 0 0 0', color: 'gray', fontSize: '14px'}}>📍 {shop.address}</p>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    )
}

export default Roulette