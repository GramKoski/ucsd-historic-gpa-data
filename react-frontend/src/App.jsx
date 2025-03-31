import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { AutoComplete, Tag } from 'antd';

const GPAVisualizer = () => {
    const [selectedDepartments, setSelectedDepartments] = useState([]);
    const [gpaData, setGpaData] = useState([]);
    const [allDepartments, setAllDepartments] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#00C49F'];

    // Fetch all departments on mount
    useEffect(() => {
        fetch('http://localhost:3001/api/departments')
            .then(res => res.json())
            .then(data => setAllDepartments(data.map(d => d.id)));
    }, []);

    // Fetch GPA data when selected departments change
    useEffect(() => {
        if (selectedDepartments.length > 0) {
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
                .then(data => setGpaData(data));
        }
    }, [selectedDepartments]);

    const handleSearch = (value) => {
        setSearchTerm(value.toUpperCase());
    };

    const handleSelect = (value) => {
        if (!selectedDepartments.includes(value)) {
            setSelectedDepartments([...selectedDepartments, value]);
        }
        setSearchTerm('');
    };

    const handleClose = (removedDept) => {
        setSelectedDepartments(selectedDepartments.filter(dept => dept !== removedDept));
    };

    return (
        <div style={{ padding: 20 }}>
            <div style={{ marginBottom: 20 }}>
                <AutoComplete
                    options={allDepartments
                        .filter(dept =>
                            dept.includes(searchTerm) &&
                            !selectedDepartments.includes(dept)
                        )
                        .map(dept => ({ value: dept }))}
                    onSelect={handleSelect}
                    onSearch={handleSearch}
                    placeholder="Search departments"
                    style={{ width: 300 }}
                    value={searchTerm}
                />

                <div style={{ marginTop: 10 }}>
                    {selectedDepartments.map((dept, index) => (
                        <Tag
                            key={dept}
                            color={colors[index % colors.length]}
                            closable
                            onClose={() => handleClose(dept)}
                        >
                            {dept}
                        </Tag>
                    ))}
                </div>
            </div>

            <LineChart
                width={800}
                height={400}
                data={gpaData}
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
                        stroke={colors[index % colors.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 8 }}
                    />
                ))}
            </LineChart>
        </div>
    );
};

export default GPAVisualizer;
