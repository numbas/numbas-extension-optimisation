Optimisation problems extension for Numbas
==========================================

This extension provides functions to work with linear programs and other optimisation problems.

JME functions
-------------

### random_partition(n,k,[minimum=1])

Generate a random partition of `n` into `k` parts, with smallest part at least `minimum`.

### best_point(program)

Solve a linear program with minimum constraints for each product, maximum constraints for each resource, numbers of each resource used in each product, and a straight line objective function

 * minimum_x, minimum_y: minimum allocations for each product
 * resources_x, resources_y: numbers of each resource used to make 1 unit of each product
 * max_resource_1, max_resource_2: available quantities of each resource
 * profit_x, profit_y: profit per unit of each product

Looks at the following intersection points:

 * 0 - resource 1 with minimum x
 * 1 - resource 2 with minimum x
 * 2 - resource 1 with minimum y
 * 3 - resource 2 with minimum y
 * 4 - resource 1 with resource 2

Returns the index of the intersection point giving maximum profit

### best_coords(program)

With program encoded as above, returns the coordinates `[x,y]` of the point giving the maximum profit

### binding_lines(program)

With program encoded as above, returns an array of booleans specifying which lines are binding (touching the optimal solution), from the following: `[resource 1, resource 2, minimum x, minimum y]`

### nw_corner(supplies,demands)

Use the NW corner algorithm to generate a first guess at an optimal solution to a transportation problem. `supplies` specifies the number of units supplied by each source, and `demand` specifies the number of units demanded by each destination.

Returns a matrix of the number of units to transport from each source to each destination.

### nw_corner_display(supplies,demands)

HTML representation of the stages of the NW corner algorithm

### minimum_cost(supplies,demands,costs)

Find the solution to the transportation problem which minimises total cost. 

Returns a matrix of the number of units to transport from each source to each destination.

### minimum_cost_display(supplies,demands,costs)

HTML representation of the stages of the minimum cost algorithm.

### shadow_costs(assignments,allocated,costs)

Returns a list `[m,rows,columns]`, where `m` is the shadow cost of each cell in the assignment matrix, and `rows` and `columns` give the shadow costs for each row and column, respectively.

### assignment_is_optimal(assignments,costs)

Returns `true` if the given assignment (matrix of number of units to deliver from each source to each destination) minimises the total cost.

### assignment_is_valid(assignments,supplies,demands)

Returns `true` if the given assignment is valid - the amount supplied from each source doesn't exceeed the available supply, and the amount delivered to each destination doesn't exceed the demand.

### stepping_stone_works(assignments,costs)

Returns `true` if the stepping stone algorithm to find an optimal assignment terminates.

### stepping_stone(assignments,costs)

Find an optimal solution to the given assignment problem, with the stepping stones method, starting with the given assignment.

Returns a matrix of assignments.

### stepping_stone_display(assignments,costs)

HTML representation of the steps of the stepping stone method.

### assignment_cost(assignments,costs)

Total cost of the given assignment

### cost_table(supply,demand,costs)

A table showing the cost matrix for the given assignment problem

### assignment_table(assignments,supply,demand)

A table showing the given assignment

### show_cost_calculation(assignments,costs)

LaTeX description of the calculation of the total cost of the given assignment

### job_cost_table(costs,worker_name,job_name)

A table showing the costs for each worker at each job. `worker_name` and `job_name` give the headings for workers and jobs, respectively (e.g., "Delivery driver" and "Route")

### hungarian(costs)

Perform the Hungarian algorithm to assign workers to jobs, minimising the total cost. Returns a matrix with `1` in the cell `(worker,job)` when the corresponding worker is assigned to the corresponding job, and `0` otherwise.

### hungarian_display(costs)

HTML representation of the steps of the Hungarian algorithm.

### utility_set(utility,actions)

HTML graph showing the given set of points in a 2D decision problem. `utility` is a list of 2d coordinates `[x,y]`, and `actions` is a list of labels.

### show_expected_value_criteria(utility,labels,prob_state_1,prob_state_2)

HTML graph showing the utility set, with the expected value criterion line defined by `prob_state_1` and `prob_state_2`.

### evpi(utility,probabilities)

Expected value of perfect information in the given decision problem, with the given (vector or list of) probabilities.

### simplex(objective,equations)

Solve the given linear programming problem with the simplex method

### simplex_optimal_tableau(objective,equations)

Matrix representing the optimal tableau when the simplex algorithm terminates.

### simplex_find_bascs(tableau)

List specifying which row each variable is basic in, in the given simplex tableau, or`-1` if the variable is not basic.

### simplex_display(objective,equations)

HTML representation of the steps of the simplex method.

### simplex_final_tableau(objective,equations)

HTML representation of an optimal simplex tableau for the given problem.

### convex_hull(points)

The convex hull of the given list of points. Returns a list of points, in clockwise order.
