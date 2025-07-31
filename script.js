// script.js – handles survey flow and prompt recommendation logic

document.addEventListener('DOMContentLoaded', async () => {
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
        // The offering question is single‑select, so retrieve a single value
        const offering = formData.get('offering');
        // Normalize to an array for filtering logic
        const offerings = offering ? [offering] : [];
        const tasks = formData.getAll('tasks');
        const familiarity = formData.get('familiarity');
        const favorites = formData.get('favorites');
        // Derive prompt level from familiarity
        const promptLevel = familiarityMapping[familiarity] || 'Basic';
        // Normalize tasks to dataset categories
        const mappedTasks = tasks.map(normalizeTask);

        // If the respondent provided favorite prompts, submit them via the hidden Web3Forms form.
        // The hidden form posts to https://api.web3forms.com/submit and includes a public access
        // key that maps submissions to your email inbox. Once you configure Web3Forms using your
        // access key, each submission will arrive directly in your email. This ensures respondents'
        // open-ended responses are captured without requiring any action from them.
        if (favorites && favorites.trim() !== '') {
            const hiddenForm = document.getElementById('hidden-submission-form');
            // Populate hidden form fields
            hiddenForm.querySelector('input[name="name"]').value = name || '';
            hiddenForm.querySelector('input[name="email"]').value = email || '';
            hiddenForm.querySelector('textarea[name="favorites"]').value = favorites;
            // Submit the form to FormSubmit via hidden iframe to avoid page navigation
            hiddenForm.submit();
        }

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
        // Group prompts by task category and deduplicate prompt texts
        const grouped = {};
        filtered.forEach(item => {
            const category = item['Task Category'];
            if (!grouped[category]) {
                grouped[category] = new Set();
            }
            grouped[category].add(item['Prompt']);
        });
        // Populate results container with user responses and grouped prompts
        const resultsContainer = document.getElementById('results-container');
        resultsContainer.innerHTML = '';
        // Always show the user's responses
        const userInfo = document.createElement('div');
        userInfo.classList.add('user-info');
        userInfo.innerHTML = `
            <p><strong>Name:</strong> ${name || ''}</p>
            <p><strong>Email:</strong> ${email || ''}</p>
            <p><strong>S&amp;T Offering:</strong> ${offering || ''}</p>
            <p><strong>Level:</strong> ${level || ''}</p>
            <p><strong>AI Familiarity:</strong> ${familiarity || ''}</p>
            <p><strong>Tasks:</strong> ${tasks.join(', ') || ''}</p>
        `;
        resultsContainer.appendChild(userInfo);

        // Summary sentence describing level and offering
        const summary = document.createElement('p');
        summary.classList.add('summary');
        // Capitalize fixed words "Level" and "Offering" in the summary sentence
        summary.textContent = `Respondents who are at ${level} Level from ${offering} Offering benefit from the following prompts:`;
        resultsContainer.appendChild(summary);

        // If no prompts matched, display a message
        if (Object.keys(grouped).length === 0) {
            const noPromptsMsg = document.createElement('p');
            noPromptsMsg.textContent = 'No prompts matched your selections. Try broadening your options.';
            resultsContainer.appendChild(noPromptsMsg);
        } else {
            // Sort categories alphabetically for consistent ordering
            const sortedCategories = Object.keys(grouped).sort();
            sortedCategories.forEach(category => {
                const header = document.createElement('h3');
                header.textContent = category;
                resultsContainer.appendChild(header);
                const ul = document.createElement('ul');
                const promptArray = Array.from(grouped[category]).sort();
                promptArray.forEach(promptText => {
                    const li = document.createElement('li');
                    li.textContent = promptText;
                    ul.appendChild(li);
                });
                resultsContainer.appendChild(ul);
            });
        }

        // Setup download button – create a Word document (.doc) with the responses and grouped prompts
        const downloadBtn = document.getElementById('downloadBtn');
        downloadBtn.onclick = () => {
            // Build the HTML body content for the Word document
            let bodyHtml = '';
            bodyHtml += `<p><strong>Name:</strong> ${name || ''}</p>`;
            bodyHtml += `<p><strong>Email:</strong> ${email || ''}</p>`;
            bodyHtml += `<p><strong>S&amp;T Offering:</strong> ${offering || ''}</p>`;
            bodyHtml += `<p><strong>Level:</strong> ${level || ''}</p>`;
            bodyHtml += `<p><strong>AI Familiarity:</strong> ${familiarity || ''}</p>`;
            bodyHtml += `<p><strong>Tasks:</strong> ${tasks.join(', ') || ''}</p>`;
            bodyHtml += `<p>Respondents who are at ${level} Level from ${offering} Offering benefit from the following prompts:</p>`;
            if (Object.keys(grouped).length === 0) {
                bodyHtml += `<p>No prompts matched your selections.</p>`;
            } else {
                Object.keys(grouped).sort().forEach(category => {
                    bodyHtml += `<h3>${category}</h3>`;
                    bodyHtml += '<ul>';
                    Array.from(grouped[category]).sort().forEach(promptText => {
                        bodyHtml += `<li>${promptText}</li>`;
                    });
                    bodyHtml += '</ul>';
                });
            }
            // Word document preamble for Office compatibility
            const preHtml = "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
                "xmlns:w='urn:schemas-microsoft-com:office:word' " +
                "xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Recommended Prompts</title></head><body>";
            const postHtml = "</body></html>";
            const html = preHtml + bodyHtml + postHtml;
            // Create a blob with the Word MIME type
            const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'recommended_prompts.doc';
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

    // Fetch prompts.json file synchronously at startup to ensure data is available when the user submits
    try {
        const response = await fetch('prompts.json');
        promptsData = await response.json();
    } catch (err) {
        console.error('Error loading prompts:', err);
        promptsData = [];
    }

    // Initialize first step
    showStep(currentStep);
});