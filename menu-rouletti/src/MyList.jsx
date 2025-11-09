import { useEffect, useState } from "react"
import { auth, db } from "./firebase"
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore"

function MyList() {
    const [myList, setMyList] = useState([])
    const [isLoading, setIsLoading] = useState(true)

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

    if (isLoading) return <div style={{ padding: '20px' }}>로딩 중...</div>

    return (
        <div style={{ padding: '20px' }}>
            <h2>나만의 맛집 리스트 ({myList.length}개)</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {myList.map((item) => (
                    <li key={item.id} style={{ border: '1px solid #ddd', padding: '15px', marginBottom: '10px', borderRadius: '8px' }}>
                        <h3 style={{ margin: '0 0 10px 0'}}>
                            {item.shop.name}
                            <span style={{ fontSize: '14px', color: 'white', background: '#007bff', padding: '2px 8px', borderRadius: '10px', marginLeft: '10px' }}>
                                {item.location_tag}
                            </span>
                        </h3>
                        <p style={{ margin: 0, fontSize: '16px', fontWeight: 'bold' }}>🏷️ 메뉴: {item.menu_name}</p>
                        <p style={{ margin: '5px 0 0 0', color: 'gray', fontSize: '14px' }}>📍 {item.shop.address}</p>
                    </li>
                ))}
            </ul>

            {myList.length === 0 && <p>아직 저장된 맛집이 없습니다. 지도에서 찾아보세요!</p>}
        </div>
    )
}

export default MyList