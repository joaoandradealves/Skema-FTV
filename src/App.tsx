import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/StudentDashboard';
import TeacherDashboard from './pages/TeacherDashboard';
import Plans from './pages/Plans';
import CreateClass from './pages/CreateClass';
import ManagePlans from './pages/ManagePlans';

import Profile from './pages/Profile';
import AdminDashboard from './pages/AdminDashboard';
import ManageTeachers from './pages/ManageTeachers';
import ClassManagement from './pages/ClassManagement';
import ClassSelection from './pages/ClassSelection';
import StudentHistory from './pages/StudentHistory';
import ManageApprovals from './pages/ManageApprovals';
import CourtBooking from './pages/CourtBooking';
import DayUse from './pages/DayUse';
import ManageLeisure from './pages/ManageLeisure';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/student" element={<StudentDashboard />} />
        <Route path="/teacher" element={<TeacherDashboard />} />
        <Route path="/plans" element={<Plans />} />
        <Route path="/create-class" element={<CreateClass />} />
        <Route path="/manage-plans" element={<ManagePlans />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/admin" element={<AdminDashboard />} />
        <Route path="/manage-teachers" element={<ManageTeachers />} />
        <Route path="/class-management/:id" element={<ClassManagement />} />
        <Route path="/book-class" element={<ClassSelection />} />
        <Route path="/student/history" element={<StudentHistory />} />
        <Route path="/admin/approvals" element={<ManageApprovals />} />
        <Route path="/court-booking" element={<CourtBooking />} />
        <Route path="/day-use" element={<DayUse />} />
        <Route path="/admin/leisure" element={<ManageLeisure />} />
      </Routes>
    </Router>
  );
}
