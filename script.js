// script.js

let currentData;

// Entry point - Load and preprocess data
d3.csv('airplane_crashes.csv').then(data => {
    currentData = data;

    // Populate year dropdown with unique years
    const yearDropdown = document.getElementById('year');
    const uniqueYears = [...new Set(data.map(d => +d.Date))];
    
    uniqueYears.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        yearDropdown.appendChild(option);
    });

    // Populate operator dropdown with unique operators
    const operatorDropdown = document.getElementById('operator');
    const uniqueOperators = [...new Set(data.map(d => d.Operator))];
    
    uniqueOperators.forEach(operator => {
        const option = document.createElement('option');
        option.value = operator;
        option.textContent = operator;
        operatorDropdown.appendChild(option);
    });

    // Initial chart
    updateVisualization();
});

// Utility function to clear existing chart
function clearChart() {
    d3.select('#chart').selectAll('*').remove();
}

// Function to update the visualization based on user input
function updateVisualization() {
    const yearDropdown = document.getElementById('year');

    // Check if the dropdown element exists
    if (yearDropdown) {
        const selectedYear = +yearDropdown.value;
        const selectedOperator = document.getElementById('operator').value.trim();
        const chartType = document.getElementById('chart-type').value;

        // Call the appropriate chart creation function based on user input


        createChart(chartType, selectedYear, selectedOperator,selectedYear);
    } else {
        console.error('Year dropdown element not found.');
    }
}

// Function to create a chart based on chart type
function createChart(chartType, selectedYear, selectedOperator) {
    // Clear existing chart
    clearChart();

    const margin = { top: 50, right: 50, bottom: 70, left: 80 };
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    // Filter data based on the selected year and operator
    let filteredData = currentData.filter(d => +d.Date === selectedYear);
    if (selectedOperator) {
        filteredData = filteredData.filter(d => d.Operator.includes(selectedOperator));
    }

    // Aggregate data by operator using d3.nest
    const nestedData = d3.nest()
        .key(d => d.Operator)
        .rollup(values => ({
            Fatalities: d3.sum(values, d => +d.Fatalities),
            Aboard: d3.sum(values, d => +d.Aboard)
        }))
        .entries(filteredData);

    // Convert nestedData to an array of objects
    const aggregatedArray = nestedData.map(d => ({
        Operator: d.key,
        Fatalities: d.value.Fatalities,
        Aboard: d.value.Aboard
    }));

    // Create SVG element
    const svg = createSvg('#chart', width, height, margin);

    // Data preprocessing (if needed)

    // Create scales and axes
    const xScale = createScaleBand(aggregatedArray.map(d => d.Operator), [0, width], 0.1);
    const yScale = createScaleLinear([0, d3.max(aggregatedArray, d => Math.max(d.Fatalities, d.Aboard))], [height, 0]);

    // Pass width and height to createAxes
    createAxes(svg, xScale, yScale, height);

    // Create and render chart based on chart type
    switch (chartType) {
        case 'bar':
            createBars(svg, aggregatedArray, xScale, yScale);
            break;
        case 'pie':
            const pieData = aggregatedArray.map(d => ({
                Operator: d.Operator,
                value: d.Fatalities + d.Aboard
            }));
            const yearDropdown = document.getElementById('year');

            // Check if the dropdown element exists
                const selectedYear = +yearDropdown.value;
            createPieChart(svg, pieData, width, height,selectedYear);
            break;
        // Add more cases for additional chart types
    }

    // Add labels and title
    createLabels(svg, width, height, margin, 'Operator', 'Count');
    createTitle(svg, width, height, margin, `Airplane Crashes by Operator and Count`);
}

// Function to create SVG element
function createSvg(selector, width, height, margin) {
    return d3.select(selector)
        .append('svg')
        .attr('width', width + margin.left + margin.right)
        .attr('height', height + margin.top + margin.bottom)
        .append('g')
        .attr('transform', `translate(${margin.left},${margin.top})`);
}

// Function to create scales
function createScaleBand(domain, range, padding) {
    return d3.scaleBand()
        .domain(domain)
        .range(range)
        .padding(padding);
}

// Function to create linear scale
function createScaleLinear(domain, range) {
    return d3.scaleLinear()
        .domain(domain)
        .range(range);
}

// Function to create axes
function createAxes(svg, xScale, yScale, height) {
    // X-axis
    svg.append('g')
        .attr('class', 'x-axis')
        .attr('transform', `translate(0, ${height})`)
        .call(d3.axisBottom(xScale))
        .selectAll('text')
        .attr('transform', 'rotate(-45)')
        .style('text-anchor', 'end');

    // Y-axis
    svg.append('g')
        .attr('class', 'y-axis')
        .call(d3.axisLeft(yScale));
}

// Function to create grouped bars in a bar chart for both Fatalities and Aboard
function createBars(svg, data, xScale, yScale) {
    // Grouped bars for each operator
    const groupedBars = svg.selectAll('.grouped-bar')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'grouped-bar')
        .attr('transform', d => `translate(${xScale(d.Operator)}, 0)`);

    // Bar for Fatalities
    groupedBars.append('rect')
        .attr('class', 'bar fatalities')
        .attr('x', 0)
        .attr('y', d => yScale(d.Fatalities))
        .attr('width', xScale.bandwidth() / 2)
        .attr('height', d => height - yScale(d.Fatalities))
        .append('title')
        .text(d => `Operator: ${d.Operator}\nFatalities: ${d.Fatalities}`);

    // Bar for Aboard
    groupedBars.append('rect')
        .attr('class', 'bar aboard')
        .attr('x', xScale.bandwidth() / 2)
        .attr('y', d => yScale(d.Aboard))
        .attr('width', xScale.bandwidth() / 2)
        .attr('height', d => height - yScale(d.Aboard))
        .append('title')
        .text(d => `Operator: ${d.Operator}\nAboard: ${d.Aboard}`);
}
// Function to create a pie chart
function createPieChart(svg, data, width, height, selectedYear) {
    const radius = Math.min(width, height) / 2;
    const pie = d3.pie().value(d => d.value);

    const arc = d3.arc()
        .innerRadius(0)
        .outerRadius(radius);

    const color = d3.scaleOrdinal(d3.schemeCategory10);

    const arcs = svg.selectAll('.arc')
        .data(pie(data))
        .enter().append('g')
        .attr('class', 'arc')
        .attr('transform', `translate(${width / 2},${height / 2})`);

    arcs.append('path')
        .attr('d', arc)
        .attr('fill', (d, i) => color(i))
        .append('title')
        .text(d => `Operator: ${d.data.Operator}\nAccidents: ${d.data.value}\nFatalities: ${d.data.Fatalities}\nAboard: ${d.data.Aboard}`);

    // Label placement
    const labelArc = d3.arc()
        .outerRadius(radius - 40)
        .innerRadius(radius - 40);

    // Operator labels with total number of accidents for the selected year
    arcs.append('text')
        .attr('transform', d => `translate(${labelArc.centroid(d)})`)
        .attr('dy', '.35em')
        .text(d => {
            const filteredData = filterDataByOperatorAndYear(currentData, d.data.Operator, selectedYear);
            const totalAccidents = filteredData.length;
            return `${d.data.Operator}\n(${totalAccidents} accident${totalAccidents !== 1 ? 's' : ''})`;
        })
        .style('text-anchor', 'middle')
        .style('font-size', '10px');

    // Legend
    const legend = svg.selectAll('.legend')
        .data(data)
        .enter()
        .append('g')
        .attr('class', 'legend')
        .attr('transform', (d, i) => `translate(${width - 100},${i * 20})`);

    legend.append('rect')
        .attr('x', 0)
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', (d, i) => color(i));

    legend.append('text')
        .attr('x', 25)
        .attr('y', 9)
        .attr('dy', '.35em')
        .style('text-anchor', 'start')
        .text(d => `${d.Operator} - ${d.value}`);
}

// Function to filter data by operator and year
function filterDataByOperatorAndYear(data, operator, year) {
    return data.filter(d => d.Operator === operator && new Date(d.Date).getFullYear() === parseInt(year, 10));
}


// Function to filter data by operator
function filterDataByOperator(data, operator) {
    return data.filter(d => d.Operator === operator);
}





// Function to add labels
function createLabels(svg, width, height, margin, xLabel, yLabel) {
    // X-axis label
    svg.append('text')
        .attr('class', 'x-label')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', height + margin.top + 40)
        .text(xLabel);

    // Y-axis label
    svg.append('text')
        .attr('class', 'y-label')
        .attr('text-anchor', 'middle')
        .attr('x', -margin.top - height / 2)
        .attr('y', -margin.left + 20)
        .attr('transform', 'rotate(-90)')
        .text(yLabel);
}

// Function to add title
function createTitle(svg, width, height, margin, titleText) {
    svg.append('text')
        .attr('class', 'chart-title')
        .attr('text-anchor', 'middle')
        .attr('x', width / 2)
        .attr('y', -margin.top / 2)
        .text(titleText);
}
