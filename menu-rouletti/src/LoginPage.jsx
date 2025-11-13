function LoginPage({ onGoogleLogin }) {
    return (
        <div>
            <h2>로그인이 필요합니다</h2>
            <div style={{ textAlign: 'center', marginTop: '50px'}}>
                <h1>룰렛</h1>
                <button
                    onClick={onGoogleLogin}
                    style={{ padding: '10px 20px', fontSize: '16px' }}
                >
                    google로 로그인
                </button>
            </div>
        </div>
    )
}

export default LoginPage