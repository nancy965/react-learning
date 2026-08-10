import "./Users.css";
import { useState, useEffect } from "react";
import UserCard from "../component/UserCard";
import SearchBox from "../component/SearchBox";
import Loader from "../component/Loader";
import AddUser from "../component/AddUser";
import { getUsers } from "../services/userService";

function Users() {

    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [status, setStatus] = useState("all");
    const [currentPage, setCurrentPage] = useState(1);
    const usersPerPage = 5;

    const fetchUsers = () => {

        setLoading(true);
        setError(false);
        getUsers()
            .then((res) => {
                console.log(res);
                setUsers(res.data);
                setLoading(false);

            })
            .catch((err) => {
                console.log(err);
                setError(true);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const filteredUsers = users.filter((user) => {
        const matchesSearch = user.name
            .toLowerCase()
            .includes(search.toLowerCase());

        const matchesStatus =
            status === "all" ||
            (status === "active" && user.is_active === true) ||
            (status === "inactive" && user.is_active === false);
        return matchesSearch && matchesStatus;
    });

//pagination
    const totalPages = Math.ceil(
        filteredUsers.length / usersPerPage
    );
    const startIndex =
        (currentPage - 1) * usersPerPage;
    const currentUsers = filteredUsers.slice(
        startIndex,
        startIndex + usersPerPage
    );

    if (loading) {
        return <Loader />;
    }
   
    if (error) {
        return (
            <div>
                <h2>Unable to load users.</h2>
                <p>Please try again.</p>
                <button onClick={fetchUsers}>
                    Retry
                </button>
            </div>
        );
    }

    return (
        <div className="users-page">
            <h2>User Management</h2>
            <AddUser refreshUsers={fetchUsers} />
            <SearchBox
                search={search}
                setSearch={(value) => {

                    setSearch(value);
                    setCurrentPage(1);

                }}/>
            <select
                value={status}
                onChange={(e) => {
                    setStatus(e.target.value);
                    setCurrentPage(1);
                }}>
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
            </select>

            <div className="user-table">
                <div className="user-header">
                    <div>Name</div>
                    <div>Email</div>
                    <div>Age</div>
                    <div>Action</div>
                </div>
                {currentUsers.map((user) => (
                    <UserCard
                        key={user.id}
                        user={user}
                        refreshUsers={fetchUsers}/>
                ))}
            </div>
            {currentUsers.length === 0 && (
                <p>No users found.</p>
            )}
           
            <div className="pagination">
                <button onClick={() =>
                        setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}>
                    Previous</button>

                <span>Page {currentPage} of {totalPages || 1}</span>
                <button onClick={() =>
                        setCurrentPage(currentPage + 1)
                    }
                    disabled={
                        currentPage === totalPages}>Next</button>
            </div>
        </div>
    );
}
export default Users;
