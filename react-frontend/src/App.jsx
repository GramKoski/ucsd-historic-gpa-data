import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { AutoComplete, Tag, Spin, Select } from 'antd';

const GPAVisualizer = () => {
    // Unified state for departments and courses
    const [selectedItems, setSelectedItems] = useState([]);
    const [graphData, setGraphData] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [allDepartments, setAllDepartments] = useState([]);

    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F', '#6C5B7B', '#C06C84', '#F67280', '#355C7D', '#F8B195'];

    // Fetch all departments on mount
    useEffect(() => {
        fetch('http://localhost:3001/api/departments')
            .then(res => res.json())
            .then(data => setAllDepartments(data.map(d => d.id)));
    }, []);

    // Fetch data when selected items change
    useEffect(() => {
        if (selectedItems.length === 0) return;

        const departments = selectedItems.filter(item => item.type === 'department').map(item => item.id);
        const courses = selectedItems.filter(item => item.type === 'course');

        setLoading(true);

        // Prepare promises for all data fetches
        const fetchPromises = [];

        // Fetch department data if needed
        if (departments.length > 0) {
            fetchPromises.push(
                fetch('http://localhost:3001/api/departments/compare', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        departments: departments,
                        startYear: 7,
                        endYear: 24
                    })
                })
                    .then(res => res.json())
                    .then(data => ({ type: 'department', data }))
            );
        }

        // Fetch course data for each course
        courses.forEach(course => {
            fetchPromises.push(
                fetch('http://localhost:3001/api/course/gpa', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        department: course.department,
                        courseIdentifier: course.courseNumber,
                        startYear: 7,
                        endYear: 24
                    })
                })
                    .then(res => res.json())
                    .then(data => ({ type: 'course', id: `${course.department} ${course.courseNumber}`, data }))
            );
        });

        // Process all fetched data
        Promise.all(fetchPromises)
            .then(results => {
                // Start with merging all data by quarter
                const mergedData = {};

                // Process department data
                results.forEach(result => {
                    if (result.type === 'department') {
                        result.data.forEach(item => {
                            const key = item.quarter;

                            if (!mergedData[key]) {
                                mergedData[key] = {
                                    quarter: key,
                                    year: item.year,
                                    quarterIndex: item.quarterIndex
                                };
                            }

                            // Add department data
                            departments.forEach(dept => {
                                if (item[dept] !== undefined && item[dept] !== null) {
                                    mergedData[key][dept] = item[dept];
                                }
                            });
                        });
                    } else if (result.type === 'course') {
                        result.data.forEach(item => {
                            const key = item.quarter;

                            if (!mergedData[key]) {
                                mergedData[key] = {
                                    quarter: key,
                                    year: item.year,
                                    quarterIndex: item.quarterIndex
                                };
                            }

                            // Add course data
                            mergedData[key][result.id] = item[result.id];
                        });
                    }
                });

                // Convert to array and sort by time
                const sortedData = Object.values(mergedData).sort((a, b) => {
                    if (a.year !== b.year) return a.year - b.year;
                    return a.quarterIndex - b.quarterIndex;
                });

                setGraphData(sortedData);
                setLoading(false);
            })
            .catch(err => {
                console.error('Error fetching data:', err);
                setLoading(false);
            });

    }, [selectedItems]);

    // Search handler
    const handleSearch = (value) => {
        setSearchTerm(value);

        if (!value || value.length < 2) {
            setSearchResults([]);
            return;
        }

        // Search for departments
        const departmentResults = allDepartments
            .filter(dept => dept.toUpperCase().includes(value.toUpperCase()))
            .map(dept => ({
                value: `dept_${dept}`,
                label: `Department: ${dept}`,
                data: { type: 'department', id: dept }
            }));

        // Search for courses
        fetch(`http://localhost:3001/api/courses/search?query=${encodeURIComponent(value)}`)
            .then(res => res.json())
            .then(data => {
                const courseResults = data.map(course => ({
                    value: `course_${course.id}`,
                    label: course.displayName,
                    data: {
                        type: 'course',
                        id: `${course.department} ${course.courseIdentifier}`,
                        department: course.department,
                        courseNumber: course.courseIdentifier
                    }
                }));

                setSearchResults([...departmentResults, ...courseResults]);
            })
            .catch(err => {
                console.error('Error searching courses:', err);
                setSearchResults(departmentResults);
            });
    };

    // Item selection handler
    const handleSelect = (value, option) => {
        const newItem = option.data;

        if (!selectedItems.some(item =>
            item.type === newItem.type && item.id === newItem.id
        )) {
            setSelectedItems([...selectedItems, newItem]);
        }

        setSearchTerm('');
    };

    // Item removal handler
    const handleRemoveItem = (itemToRemove) => {
        setSelectedItems(selectedItems.filter(item =>
            !(item.type === itemToRemove.type && item.id === itemToRemove.id)
        ));
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 20 }}>
                <h1>GPA Visualizer</h1>
                <p>Search for departments or specific courses to compare GPA data</p>

                <AutoComplete
                    options={searchResults}
                    onSelect={handleSelect}
                    onSearch={handleSearch}
                    placeholder="Search departments or courses"
                    style={{ width: 400 }}
                    value={searchTerm}
                />

                <div style={{ marginTop: 10 }}>
                    {selectedItems.map((item, index) => (
                        <Tag
                            key={`${item.type}_${item.id}`}
                            color={colors[index % colors.length]}
                            closable
                            onClose={() => handleRemoveItem(item)}
                        >
                            {item.type === 'department' ? `Dept: ${item.id}` : item.id}
                        </Tag>
                    ))}
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: 20 }}>
                    <Spin size="large" />
                </div>
            ) : (
                graphData.length > 0 && (
                    <LineChart
                        width={900}
                        height={500}
                        data={graphData}
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

                        {selectedItems.map((item, index) => (
                            <Line
                                key={`${item.type}_${item.id}`}
                                type="monotone"
                                dataKey={item.id}
                                name={item.type === 'department' ? `Dept: ${item.id}` : item.id}
                                stroke={colors[index % colors.length]}
                                strokeWidth={2}
                                dot={{ r: 4 }}
                                activeDot={{ r: 8 }}
                                connectNulls={true}
                                strokeDasharray={item.type === 'department' ? "5 5" : "0"}
                            />
                        ))}
                    </LineChart>
                )
            )}
        </div>
    );
};

export default GPAVisualizer;