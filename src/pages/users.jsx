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

    

    const fetchUsers = () => {

        setLoading(true);
        setError(false);

        getUsers()
            .then((res) => {

                console.log(res);

                setTimeout(() => {
                    setUsers(res.data);
                    setLoading(false);
                }, 3000);

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

   

    const filteredUsers = users.filter((user) =>
        user.name.toLowerCase().includes(search.toLowerCase())
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

            <h2>Employee List</h2>
             <AddUser refreshUsers={fetchUsers}/>

            <SearchBox
                search={search}
                setSearch={setSearch}/>

        <div className="user-container">
            {filteredUsers.map((user, index) => (
                <UserCard
                    key={index}
                    user={user}/>
            ))}

        </div>
        </div>
    );
}

export default Users;