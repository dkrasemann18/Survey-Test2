// script.js – handles survey flow and prompt recommendation logic

document.addEventListener('DOMContentLoaded', () => {
    const steps = document.querySelectorAll('.step');
    const progress = document.getElementById('progress');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const form = document.getElementById('survey-form');
    let currentStep = 0;
    let promptsData = [];

    // Mapping user familiarity to prompt levels
    const familiarityMapping = {
        High: 'Advanced',
        Medium: 'Enhanced',
        Low: 'Basic'
    };

    // Normalize task names to match dataset
    function normalizeTask(task) {
        if (!task) return task;
        // Map brainstorming/ideation to Brainstorm
        if (task.trim().toLowerCase().startsWith('brainstorm')) {
            return 'Brainstorm';
        }
        // Map drafting & writing tasks
        if (task.trim().toLowerCase().startsWith('drafting')) {
            return 'Drafting & Writing';
        }
        // All other tasks match exactly as provided in dataset
        return task;
    }

    // Show the appropriate step and update progress bar
    function showStep(index) {
        steps.forEach((step, i) => {
            step.style.display = i === index ? 'block' : 'none';
        });
        // Update progress: index ranges 0‑7; last index is results step
        const totalSteps = steps.length - 1; // exclude results for progress calculation
        const ratio = index / totalSteps;
        progress.style.width = `${Math.min(ratio * 100, 100)}%`;
        // Update navigation buttons
        if (index === 0) {
            prevBtn.style.display = 'none';
        } else {
            prevBtn.style.display = 'inline-block';
        }
        if (index === steps.length - 1) {
            // results step – hide navigation completely
            document.querySelector('.navigation').style.display = 'none';
        } else {
            document.querySelector('.navigation').style.display = 'flex';
            if (index === steps.length - 2) {
                nextBtn.textContent = 'Submit';
            } else {
                nextBtn.textContent = 'Next';
            }
        }
    }

    // Process form and filter prompts
    function processForm() {
        // Validate the form before processing
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }
        const formData = new FormData(form);
        const name = formData.get('name');
        const email = formData.get('email');
        const level = formData.get('level');
        const offerings = formData.getAll('offering');
        const tasks = formData.getAll('tasks');
        const familiarity = formData.get('familiarity');
        const favorites = formData.get('favorites');
        // Derive prompt level from familiarity
        const promptLevel = familiarityMapping[familiarity] || 'Basic';
        // Normalize tasks to dataset categories
        const mappedTasks = tasks.map(normalizeTask);
        // Filter prompts
        const filtered = promptsData.filter(item => {
            // Offering must match one of selected offerings
            if (!offerings.includes(item['S&T Offering'])) return false;
            // Task category must match one of selected (after normalization)
            if (!mappedTasks.includes(item['Task Category'])) return false;
            // Prompt level must match derived level
            if (item['Prompt Level'] !== promptLevel) return false;
            // Recommended level must match user's level exactly
            if (item['Recommended Level'] !== level) return false;
            return true;
        });
        // Extract unique prompt texts
        const prompts = Array.from(new Set(filtered.map(item => item['Prompt'])));
        // Populate results container
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = '';
        if (prompts.length === 0) {
            resultsContainer.innerHTML = '<p>No prompts matched your selections. Try broadening your options.</p>';
        } else {
            const ul = document.createElement('ul');
            prompts.sort().forEach(prompt => {
                const li = document.createElement('li');
                li.textContent = prompt;
                ul.appendChild(li);
            });
            resultsContainer.appendChild(ul);
        }
        // Setup download button
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.onclick = () => {
            const content = prompts.join('\n\n');
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'recommended_prompts.txt';
            link.style.display = 'none';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        };
        // Advance to results step
        currentStep = steps.length - 1;
        showStep(currentStep);
    }

    // Event listeners for navigation
    nextBtn.addEventListener('click', () => {
        // If we are on the last question step, process and show results
        if (currentStep === steps.length - 2) {
            processForm();
        } else {
            // Validate current step fields if there are any required ones
            const currentFields = steps[currentStep].querySelectorAll('input[required], textarea[required]');
            let valid = true;
            currentFields.forEach(field => {
                if (!field.checkValidity()) {
                    valid = false;
                }
            });
            if (!valid) {
                // Show native validation message
                currentFields[0].reportValidity();
                return;
            }
            currentStep++;
            showStep(currentStep);
        }
    });

    prevBtn.addEventListener('click', () => {
        if (currentStep > 0) {
            currentStep--;
            showStep(currentStep);
        }
    });

    // Fetch prompts.json file
    fetch('prompts.json')
        .then(response => response.json())
        .then(data => {
            promptsData = data;
        })
        .catch(err => {
            console.error('Error loading prompts:', err);
        });

    // Initialize first step
    showStep(currentStep);
});