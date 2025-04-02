import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { AutoComplete, Tag, Tabs, Radio, Spin } from 'antd';

const { TabPane } = Tabs;

const GPAVisualizer = () => {
    // State for departments
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [departmentGpaData, setDepartmentGpaData] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [departmentSearchTerm, setDepartmentSearchTerm] = useState('');

    // State for courses
    const [selectedCourses, setSelectedCourses] = useState([]);
    const [courseGpaData, setCourseGpaData] = useState([]);
    const [availableCourses, setAvailableCourses] = useState([]);
    const [courseSearchTerm, setCourseSearchTerm] = useState('');
    const [selectedDepartmentForCourses, setSelectedDepartmentForCourses] = useState(null);

    // Shared state
    const [activeTab, setActiveTab] = useState('departments');
    const [loading, setLoading] = useState(false);
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#6C5B7B', '#C06C84', '#F67280', '#355C7D', '#F8B195'];

    // Fetch all departments on mount
    useEffect(() => {
        fetch('http://localhost:3001/api/departments')
            .then(res => res.json())
            .then(data => setAllDepartments(data.map(d => d.id)));
    }, []);

    // Fetch GPA data when selected departments change
    useEffect(() => {
        if (selectedDepartments.length > 0) {
            setLoading(true);
            fetch('http://localhost:3001/api/departments/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    departments: selectedDepartments,
                    startYear: 7,
                    endYear: 24
                })
            })
                .then(res => res.json())
                .then(data => {
                    setDepartmentGpaData(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error fetching department data:', err);
                    setLoading(false);
                });
        }
    }, [selectedDepartments]);

    // Fetch courses for selected department
    useEffect(() => {
        if (selectedDepartmentForCourses) {
            fetch(`http://localhost:3001/api/courses/${selectedDepartmentForCourses}`)
                .then(res => res.json())
                .then(data => setAvailableCourses(data))
                .catch(err => console.error('Error fetching courses:', err));
        } else {
            setAvailableCourses([]);
        }
    }, [selectedDepartmentForCourses]);

    // Fetch GPA data for selected courses
    useEffect(() => {
        if (selectedCourses.length > 0) {
            setLoading(true);
            fetch('http://localhost:3001/api/courses/compare', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    courses: selectedCourses,
                    startYear: 7,
                    endYear: 24
                })
            })
                .then(res => res.json())
                .then(data => {
                    setCourseGpaData(data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error('Error fetching course data:', err);
                    setLoading(false);
                });
        }
    }, [selectedCourses]);

    // Department handlers
    const handleDepartmentSearch = (value) => {
        setDepartmentSearchTerm(value.toUpperCase());
    };

    const handleDepartmentSelect = (value) => {
        if (!selectedDepartments.includes(value)) {
            setSelectedDepartments([...selectedDepartments, value]);
        }
        setDepartmentSearchTerm('');
    };

    const handleDepartmentClose = (removedDept) => {
        setSelectedDepartments(selectedDepartments.filter(dept => dept !== removedDept));
    };

    // Course handlers
    const handleDepartmentForCoursesChange = (e) => {
        setSelectedDepartmentForCourses(e.target.value);
        setSelectedCourses([]);
    };

    const handleCourseSearch = (value) => {
        setCourseSearchTerm(value.toUpperCase());
    };

    const handleCourseSelect = (value) => {
        if (!selectedCourses.includes(value)) {
            setSelectedCourses([...selectedCourses, value]);
        }
        setCourseSearchTerm('');
    };

    const handleCourseClose = (removedCourse) => {
        setSelectedCourses(selectedCourses.filter(course => course !== removedCourse));
    };

    // Tab change handler
    const handleTabChange = (key) => {
        setActiveTab(key);
    };

    return (
        <div style={{ padding: 20 }}>
            <Tabs activeKey={activeTab} onChange={handleTabChange}>
                <TabPane tab="Department Comparison" key="departments">
                    <div style={{ marginBottom: 20 }}>
                        <AutoComplete
                            options={allDepartments
                                .filter(dept =>
                                    dept.includes(departmentSearchTerm) &&
                                    !selectedDepartments.includes(dept)
                                )
                                .map(dept => ({ value: dept }))}
                            onSelect={handleDepartmentSelect}
                            onSearch={handleDepartmentSearch}
                            placeholder="Search departments"
                            style={{ width: 300 }}
                            value={departmentSearchTerm}
                        />

                        <div style={{ marginTop: 10 }}>
                            {selectedDepartments.map((dept, index) => (
                                <Tag
                                    key={dept}
                                    color={colors[index % colors.length]}
                                    closable
                                    onClose={() => handleDepartmentClose(dept)}
                                >
                                    {dept}
                                </Tag>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <Spin size="large" />
                        </div>
                    ) : (
                        departmentGpaData.length > 0 && (
                            <LineChart
                                width={800}
                                height={400}
                                data={departmentGpaData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="quarter"
                                    tickFormatter={(value) => value.replace(/(\D+)\s(\d+)/, '$1 $2')}
                                />
                                <YAxis domain={[0, 4]} />
                                <Tooltip />
                                <Legend />

                                {selectedDepartments.map((dept, index) => (
                                    <Line
                                        key={dept}
                                        type="monotone"
                                        dataKey={dept}
                                        name={dept}
                                        stroke={colors[index % colors.length]}
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 8 }}
                                        connectNulls={true}
                                    />
                                ))}
                            </LineChart>
                        )
                    )}
                </TabPane>

                <TabPane tab="Course Comparison" key="courses">
                    <div style={{ marginBottom: 20 }}>
                        <div style={{ marginBottom: 10 }}>
                            <span style={{ marginRight: 10 }}>Select Department:</span>
                            <Radio.Group onChange={handleDepartmentForCoursesChange} value={selectedDepartmentForCourses}>
                                {allDepartments.slice(0, 10).map(dept => (
                                    <Radio.Button key={dept} value={dept}>{dept}</Radio.Button>
                                ))}
                                {allDepartments.length > 10 && (
                                    <AutoComplete
                                        style={{ width: 120 }}
                                        options={allDepartments
                                            .filter(dept => dept.includes(departmentSearchTerm))
                                            .map(dept => ({ value: dept }))}
                                        placeholder="More..."
                                        onSelect={(value) => setSelectedDepartmentForCourses(value)}
                                    />
                                )}
                            </Radio.Group>
                        </div>

                        {selectedDepartmentForCourses && (
                            <AutoComplete
                                options={availableCourses
                                    .filter(course =>
                                        course.id.includes(courseSearchTerm) &&
                                        !selectedCourses.includes(course.id)
                                    )
                                    .map(course => ({ value: course.id, label: `${course.id} - ${course.name}` }))}
                                onSelect={handleCourseSelect}
                                onSearch={handleCourseSearch}
                                placeholder="Search courses"
                                style={{ width: 300 }}
                                value={courseSearchTerm}
                            />
                        )}

                        <div style={{ marginTop: 10 }}>
                            {selectedCourses.map((course, index) => (
                                <Tag
                                    key={course}
                                    color={colors[index % colors.length]}
                                    closable
                                    onClose={() => handleCourseClose(course)}
                                >
                                    {course}
                                </Tag>
                            ))}
                        </div>
                    </div>

                    {loading ? (
                        <div style={{ textAlign: 'center', padding: 20 }}>
                            <Spin size="large" />
                        </div>
                    ) : (
                        courseGpaData.length > 0 && (
                            <LineChart
                                width={800}
                                height={400}
                                data={courseGpaData}
                                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis
                                    dataKey="quarter"
                                    tickFormatter={(value) => value.replace(/(\D+)\s(\d+)/, '$1 $2')}
                                />
                                <YAxis domain={[0, 4]} />
                                <Tooltip />
                                <Legend />

                                {selectedCourses.map((course, index) => (
                                    <Line
                                        key={course}
                                        type="monotone"
                                        dataKey={course}
                                        name={course}
                                        stroke={colors[index % colors.length]}
                                        strokeWidth={2}
                                        dot={{ r: 4 }}
                                        activeDot={{ r: 8 }}
                                        connectNulls={true}
                                    />
                                ))}
                            </LineChart>
                        )
                    )}
                </TabPane>
            </Tabs>
        </div>
    );
};

export default GPAVisualizer;