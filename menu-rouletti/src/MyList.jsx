import { useEffect, useState } from "react"
import { auth, db } from "./firebase"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"

function MyList() {
    const [myList, setMyList] = useState([])
    const [isLoading, setIsLoading] = useState(true)

    const [filterText, setFilterText] = useState("")

    useEffect(() => {
        const fetchMyList = async () => {
            if (!auth.currentUser) return
            setIsLoading(true)

            try {
                const q = query(
                    collection(db, "MyMenuList"),
                    where("user_id", "==", auth.currentUser.uid)
                )
                const querySnapshot = await getDocs(q)

                const combinedData = []
                for (const docSnapshot of querySnapshot.docs) {
                    const menuData = docSnapshot.data()

                    const shopRef = doc(db, "Shops", menuData.shop_id)
                    const shopSnap = await getDoc(shopRef)

                    if (shopSnap.exists()) {
                        combinedData.push({
                            id: docSnapshot.id,
                            ...menuData,
                            shop: shopSnap.data()
                        })
                    }
                }

                combinedData.sort((a, b) => b.created_at.toDate() - a.created_at.toDate())
                console.log("최종 합체 데이터:", combinedData)
                setMyList(combinedData)

            } catch (error) {
                console.error("데이터 불러오기 실패: ", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchMyList()
    }, [])

    const filteredList = myList.filter(item => {
        const searchText = filterText.toLowerCase()

        const isShopMatch = item.shop.name.toLowerCase().includes(searchText)
        const isMenuMatch = item.menu_name.toLowerCase().includes(searchText)
        const isTagMatch = item.location_tag.toLowerCase().includes(searchText)
        // const isMemoMatch = item.memo?.toLowerCase().includes(searchText) || false

        return isShopMatch || isMenuMatch || isTagMatch
    })

    if (isLoading) return <div style={{ padding: '20px' }}>로딩 중...</div>

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '10px', borderBottom: '1px solid #eee' }}>
                <input
                    type="text"
                    placeholder="My List에서 검색 (가게, 메뉴, 태그)"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    style={{ width: '100%', padding: '8px', boxSizing: 'border-box' }}
                />
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
                <h2 style={{ padding: '15px 15px 0 15px', margin: 0, fontSize: '18px' }}>
                    나만의 맛집 리스트 ({filteredList.length}개 / 총 {myList.length}개)
                </h2>

                {myList.length === 0 ? (
                    <p style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>
                        아직 저장된 맛집이 없습니다.
                    </p>
                ) : filteredList.length === 0 ? (
                    <p style={{ padding: '20px', textAlign: 'center', color: 'gray' }}>
                        '{filterText}'에 해당하는 맛집이 없습니다.
                    </p>
                ) : (
                    <ul style={{ listStyle: 'none', padding: 0, margin: '10px 0' }}>
                        {filteredList.map((item) => (
                            <li key={item.id} style={{ borderBottom: '1px solid #ddd', padding: '15px' }}>
                                <h3 style={{ margin: '0 0 10px 0' }}>
                                    {item.shop.name}
                                    <span style={{ fontSize: '12px', color: 'white', background: '#007bff', padding: '3px 8px', borderRadius: '10px', marginLeft: '10px', verticalAlign: 'middle' }}>
                                        {item.location_tag}
                                    </span>
                                </h3>
                                <p>
                                    🏷️ 메뉴: {item.menu_name}
                                </p>
                                {item.memo && (
                                    <p style={{ margin: '5px 0 0 0', color: '#555', fontSize: '14px', background: '#f9f9f9', padding: '5px' }}>
                                        📝 {item.memo}
                                    </p>
                                )}
                                <p style={{ margin: '5px 0 0 0', color: 'gray', fontSize: '14px' }}>
                                    📍 {item.shop.address}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}

export default MyList