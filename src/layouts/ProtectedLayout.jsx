import Header from "../components/Header";
import Sidebar from "../components/Sidebar";
import "./ProtectedLayout.css";

const ProtectedLayout = ({ children }) => {
    return (
        <div className="protected-layout">

            <Header />

            <div className="layout-body">
                <Sidebar />

                <main className="main-content">
                    {children}
                </main>
            </div>

        </div>
    );
};

export default ProtectedLayout;