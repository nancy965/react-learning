function UserCard({ user }) {
    return (
        <div className="user-card">
            <p>Name: {user.name}</p>
            <p>Email: {user.email}</p>
            <p>Age: {user.age}</p>
        </div>
    );
}
export default UserCard;