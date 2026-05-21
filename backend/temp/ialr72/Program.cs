using System;
using System.Collections.Generic;

class GFG {
    
    // Function to check if it is safe to place
    static int isSafe(int[,] mat, int row, int col) {
        int n = mat.GetLength(0);
        int i, j;

        // Check this col on upper side
        for (i = 0; i < row; i++)
            if (mat[i, col] == 1)
                return 0;

        // Check upper diagonal on left side
        for (i = row - 1, j = col - 1; i >= 0 && j >= 0; i--, j--)
            if (mat[i, j] == 1)
                return 0;

        // Check upper diagonal on right side
        for (i = row - 1, j = col + 1; j < n && i >= 0; i--, j++)
            if (mat[i, j] == 1)
                return 0;

        return 1;
    }

    // Recursive function to place queens
    static void placeQueens(int row, int[,] mat, List<List<int>> result) {
        int n = mat.GetLength(0);

        // base case: If all queens are placed
        if (row == n)
        {
            // store current solution
            List<int> ans = new List<int>();
            for (int i = 0; i < n; i++)
            {
                for (int j = 0; j < n; j++)
                {
                    if (mat[i, j] == 1)
                    {
                        ans.Add(j + 1);
                    }
                }
            }
            result.Add(ans);
            return;
        }

        // Consider the row and try placing
        // queen in all columns one by one
        for (int i = 0; i < n; i++)
        {
            // Check if the queen can be placed
            if (isSafe(mat, row, i) == 1)
            {
                mat[row, i] = 1;
                placeQueens(row + 1, mat, result);

                // backtrack
                mat[row, i] = 0;
            }
        }
    }

    // Function to find all solutions
    static List<List<int>> nQueen(int n) {
      
        // Initialize the board
        int[,] mat = new int[n, n];
        List<List<int>> result = new List<List<int>>();

        // Place queens
        placeQueens(0, mat, result);

        return result;
    }

    public static void Main()
    {
        int n = 4;
        List<List<int>> result = nQueen(n);
        foreach (var ans in result)
        {
            foreach (var i in ans)
            {
                Console.Write(i + " ");
            }
            Console.WriteLine();
        }
    }
}